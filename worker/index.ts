import { type Context, Hono } from "hono";
import { z } from "zod";
import { requireAccess } from "./access";
import { aiResponse, cachedSummary } from "./ai";
import { monthFacts, trendsFacts } from "./ai-facts";
import {
	fingerprint,
	getCorpusEvents,
	getInsights,
	getPace,
	getSummary,
	getTrendRows,
} from "./data";
import { isMonth } from "./month";
import {
	accountInput,
	budgetInput,
	categoryInput,
	categoryRename,
	corpusInput,
	goalInput,
	planInput,
	type RecurringInput,
	recurringInput,
	type TransactionInput,
	transactionInput,
} from "./schemas";
import type {
	Account,
	Category,
	Goal,
	PlanRow,
	Recurring,
	Suggestion,
	Transaction,
} from "./types";

type Ctx = Context<{ Bindings: Env }>;

// today in IST, as YYYY-MM-DD
const TODAY = "date('now', '+330 minutes')";

const selectRecurring = `SELECT r.id, r.type, r.description, r.amount, r.day,
		r.category_id, c.name AS category, r.account_id, a.name AS account
	FROM recurring r
	JOIN categories c ON c.id = r.category_id
	LEFT JOIN accounts a ON a.id = r.account_id`;

const app = new Hono<{ Bindings: Env }>()
	.basePath("/api")
	.use(requireAccess)
	.get("/health", (c) => c.json({ ok: true }))
	.get("/accounts", async (c) => {
		const { results } = await c.env.DB.prepare(
			"SELECT id, name, kind, cycle_start_day FROM accounts ORDER BY id",
		).all<Account>();
		return c.json(results);
	})
	.post("/accounts", async (c) => {
		const input = await parseBody(c, accountInput);
		if ("error" in input) return c.json(input, 400);
		const a = input.data;
		return write(
			c,
			c.env.DB.prepare(
				"INSERT INTO accounts (name, kind, cycle_start_day) VALUES (?, ?, ?) RETURNING id",
			).bind(a.name, a.kind, a.cycle_start_day),
			201,
		);
	})
	.put("/accounts/:id{[0-9]+}", async (c) => {
		const input = await parseBody(c, accountInput);
		if ("error" in input) return c.json(input, 400);
		const a = input.data;
		return write(
			c,
			c.env.DB.prepare(
				"UPDATE accounts SET name = ?, kind = ?, cycle_start_day = ? WHERE id = ? RETURNING id",
			).bind(a.name, a.kind, a.cycle_start_day, Number(c.req.param("id"))),
		);
	})
	.delete("/accounts/:id{[0-9]+}", (c) =>
		removeUnused(c, "accounts", "account_id", Number(c.req.param("id"))),
	)
	.get("/categories", async (c) => {
		const { results } = await c.env.DB.prepare(
			"SELECT id, name, type, fixed, savings FROM categories ORDER BY id",
		).all<Category>();
		return c.json(results);
	})
	.post("/categories", async (c) => {
		const input = await parseBody(c, categoryInput);
		if ("error" in input) return c.json(input, 400);
		return write(
			c,
			c.env.DB.prepare(
				"INSERT INTO categories (name, type, fixed, savings) VALUES (?, ?, ?, ?) RETURNING id",
			).bind(
				input.data.name,
				input.data.type,
				Number(input.data.fixed ?? false),
				Number(input.data.savings ?? false),
			),
			201,
		);
	})
	.put("/categories/:id{[0-9]+}", async (c) => {
		const input = await parseBody(c, categoryRename);
		if ("error" in input) return c.json(input, 400);
		return write(
			c,
			c.env.DB.prepare(
				`UPDATE categories SET name = ?, fixed = COALESCE(?, fixed),
					savings = COALESCE(?, savings)
				WHERE id = ? RETURNING id`,
			).bind(
				input.data.name,
				input.data.fixed === undefined ? null : Number(input.data.fixed),
				input.data.savings === undefined ? null : Number(input.data.savings),
				Number(c.req.param("id")),
			),
		);
	})
	.delete("/categories/:id{[0-9]+}", (c) =>
		removeUnused(c, "categories", "category_id", Number(c.req.param("id"))),
	)
	.get("/transactions", async (c) => {
		const month = c.req.query("month");
		if (!isMonth(month)) return c.json({ error: "month must be YYYY-MM" }, 400);
		const { results } = await c.env.DB.prepare(
			`SELECT t.id, t.type, t.date, t.budget_month, t.amount, t.description,
				t.category_id, c.name AS category, t.account_id, a.name AS account
			FROM transactions t
			JOIN categories c ON c.id = t.category_id
			LEFT JOIN accounts a ON a.id = t.account_id
			WHERE t.budget_month = ?
			ORDER BY t.date DESC, t.id DESC`,
		)
			.bind(month)
			.all<Transaction>();
		return c.json(results);
	})
	.get("/summary", async (c) => {
		const month = c.req.query("month");
		if (!isMonth(month)) return c.json({ error: "month must be YYYY-MM" }, 400);
		return c.json(await getSummary(c.env.DB, month));
	})
	.get("/trends", async (c) => {
		const from = c.req.query("from");
		const to = c.req.query("to");
		if (!isMonth(from) || !isMonth(to)) {
			return c.json({ error: "from and to must be YYYY-MM" }, 400);
		}
		return c.json(await getTrendRows(c.env.DB, from, to));
	})
	.get("/pace", async (c) => {
		const month = c.req.query("month");
		if (!isMonth(month)) return c.json({ error: "month must be YYYY-MM" }, 400);
		return c.json(await getPace(c.env.DB, month));
	})
	.get("/insights", async (c) => {
		const month = c.req.query("month");
		if (!isMonth(month)) return c.json({ error: "month must be YYYY-MM" }, 400);
		return c.json(await getInsights(c.env.DB, month));
	})
	.get("/ai/month", async (c) => {
		const month = c.req.query("month");
		if (!isMonth(month)) return c.json({ error: "month must be YYYY-MM" }, 400);
		return aiResponse(c, async () => {
			const print = await fingerprint(c.env.DB, month, month);
			if (!print.count) return null;
			return cachedSummary(c.env, "month", month, print.print, () =>
				monthFacts(c.env.DB, month),
			);
		});
	})
	.get("/ai/trends", async (c) => {
		const from = c.req.query("from");
		const to = c.req.query("to");
		if (!isMonth(from) || !isMonth(to)) {
			return c.json({ error: "from and to must be YYYY-MM" }, 400);
		}
		return aiResponse(c, async () => {
			const print = await fingerprint(c.env.DB, from, to);
			if (!print.count) return null;
			return cachedSummary(c.env, "trends", `${from}..${to}`, print.print, () =>
				trendsFacts(c.env.DB, from, to),
			);
		});
	})
	.get("/plan", async (c) => {
		const { results } = await c.env.DB.prepare(
			`SELECT p.month, p.savings, p.capex, p.loan, p.corpus, p.note,
				(
					SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
					JOIN categories c ON c.id = t.category_id
					WHERE t.budget_month = p.month AND t.type = 'expense'
						AND c.savings = 1
				) AS saved
			FROM plan p ORDER BY p.month`,
		).all<PlanRow>();
		return c.json(results);
	})
	.put("/plan/:month{[0-9-]+}", async (c) => {
		const month = c.req.param("month");
		if (!isMonth(month)) return c.json({ error: "month must be YYYY-MM" }, 400);
		const input = await parseBody(c, planInput);
		if ("error" in input) return c.json(input, 400);
		const p = input.data;
		await c.env.DB.prepare(
			`INSERT INTO plan (month, savings, capex, loan, corpus, note)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT (month) DO UPDATE SET savings = excluded.savings,
				capex = excluded.capex, loan = excluded.loan,
				corpus = excluded.corpus, note = excluded.note`,
		)
			.bind(month, p.savings, p.capex, p.loan, p.corpus, p.note)
			.run();
		return c.body(null, 204);
	})
	.delete("/plan/:month{[0-9-]+}", async (c) => {
		const month = c.req.param("month");
		if (!isMonth(month)) return c.json({ error: "month must be YYYY-MM" }, 400);
		const { meta } = await c.env.DB.prepare("DELETE FROM plan WHERE month = ?")
			.bind(month)
			.run();
		return meta.changes
			? c.body(null, 204)
			: c.json({ error: "Not found" }, 404);
	})
	.get("/corpus", async (c) => {
		return c.json(await getCorpusEvents(c.env.DB));
	})
	.post("/corpus", async (c) => {
		const input = await parseBody(c, corpusInput);
		if ("error" in input) return c.json(input, 400);
		const e = input.data;
		return write(
			c,
			c.env.DB.prepare(
				"INSERT INTO corpus_entries (kind, amount, date, note) VALUES (?, ?, ?, ?) RETURNING id",
			).bind(e.kind, e.amount, e.date, e.note),
			201,
		);
	})
	.delete("/corpus/:id{[0-9]+}", (c) =>
		remove(c, "corpus_entries", Number(c.req.param("id"))),
	)
	.get("/goals", async (c) => {
		const { results } = await c.env.DB.prepare(
			`SELECT id, name, amount, target_month, done FROM goals
			ORDER BY done, target_month, id`,
		).all<Goal>();
		return c.json(results);
	})
	.post("/goals", async (c) => {
		const input = await parseBody(c, goalInput);
		if ("error" in input) return c.json(input, 400);
		const g = input.data;
		return write(
			c,
			c.env.DB.prepare(
				`INSERT INTO goals (name, amount, target_month, done, done_on)
				VALUES (?, ?, ?, ?, CASE WHEN ?4 = 1 THEN ${TODAY} END) RETURNING id`,
			).bind(g.name, g.amount, g.target_month, Number(g.done)),
			201,
		);
	})
	.put("/goals/:id{[0-9]+}", async (c) => {
		const input = await parseBody(c, goalInput);
		if ("error" in input) return c.json(input, 400);
		const g = input.data;
		return write(
			c,
			c.env.DB.prepare(
				`UPDATE goals SET name = ?1, amount = ?2, target_month = ?3, done = ?4,
				done_on = CASE WHEN ?4 = 1 THEN COALESCE(done_on, ${TODAY}) END
			WHERE id = ?5 RETURNING id`,
			).bind(
				g.name,
				g.amount,
				g.target_month,
				Number(g.done),
				Number(c.req.param("id")),
			),
		);
	})
	.delete("/goals/:id{[0-9]+}", (c) =>
		remove(c, "goals", Number(c.req.param("id"))),
	)
	.put("/budgets", async (c) => {
		const input = await parseBody(c, budgetInput);
		if ("error" in input) return c.json(input, 400);
		const b = input.data;
		await c.env.DB.prepare(
			`INSERT INTO budgets (month, category_id, planned) VALUES (?, ?, ?)
			ON CONFLICT (month, category_id) DO UPDATE SET planned = excluded.planned`,
		)
			.bind(b.month, b.category_id, b.planned)
			.run();
		return c.body(null, 204);
	})
	.get("/suggestions", async (c) => {
		const { results } = await c.env.DB.prepare(
			`SELECT trim(description) AS description, type, category_id, account_id,
				uses
			FROM (
				SELECT description, type, category_id, account_id,
					ROW_NUMBER() OVER latest AS rn,
					COUNT(*) OVER (PARTITION BY type, lower(trim(description))) AS uses
				FROM transactions
				WINDOW latest AS (
					PARTITION BY type, lower(trim(description)) ORDER BY date DESC, id DESC
				)
			)
			WHERE rn = 1
			ORDER BY uses DESC, description`,
		).all<Suggestion>();
		return c.json(results);
	})
	.post("/transactions", async (c) => {
		const input = await readTyped(c, transactionInput);
		if ("error" in input) return c.json(input, 400);
		const row = await c.env.DB.prepare(
			`INSERT INTO transactions
				(type, date, budget_month, amount, description, category_id, account_id,
					recurring_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
		)
			.bind(...columns(input.data), input.data.recurring_id)
			.first<{ id: number }>();
		return c.json(row, 201);
	})
	.put("/transactions/:id{[0-9]+}", async (c) => {
		const input = await readTyped(c, transactionInput);
		if ("error" in input) return c.json(input, 400);
		const row = await c.env.DB.prepare(
			`UPDATE transactions SET type = ?, date = ?, budget_month = ?, amount = ?,
				description = ?, category_id = ?, account_id = ?
			WHERE id = ? RETURNING id`,
		)
			.bind(...columns(input.data), Number(c.req.param("id")))
			.first<{ id: number }>();
		return row ? c.json(row) : c.json({ error: "Not found" }, 404);
	})
	.delete("/transactions/:id{[0-9]+}", (c) =>
		remove(c, "transactions", Number(c.req.param("id"))),
	)
	.get("/recurring", async (c) => {
		const { results } = await c.env.DB.prepare(
			`${selectRecurring} ORDER BY r.day, r.description`,
		).all<Recurring>();
		return c.json(results);
	})
	.get("/recurring/due", async (c) => {
		const month = c.req.query("month");
		if (!isMonth(month)) return c.json({ error: "month must be YYYY-MM" }, 400);
		const { results } = await c.env.DB.prepare(
			`${selectRecurring}
			WHERE NOT EXISTS (
				SELECT 1 FROM transactions t
				WHERE t.recurring_id = r.id AND t.budget_month = ?
			)
			ORDER BY r.day, r.description`,
		)
			.bind(month)
			.all<Recurring>();
		return c.json(results);
	})
	.post("/recurring", async (c) => {
		const input = await readTyped(c, recurringInput);
		if ("error" in input) return c.json(input, 400);
		return write(
			c,
			c.env.DB.prepare(
				`INSERT INTO recurring
					(type, description, amount, day, category_id, account_id)
				VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
			).bind(...recurringColumns(input.data)),
			201,
		);
	})
	.put("/recurring/:id{[0-9]+}", async (c) => {
		const input = await readTyped(c, recurringInput);
		if ("error" in input) return c.json(input, 400);
		return write(
			c,
			c.env.DB.prepare(
				`UPDATE recurring SET type = ?, description = ?, amount = ?, day = ?,
					category_id = ?, account_id = ?
				WHERE id = ? RETURNING id`,
			).bind(...recurringColumns(input.data), Number(c.req.param("id"))),
		);
	})
	.delete("/recurring/:id{[0-9]+}", (c) =>
		remove(c, "recurring", Number(c.req.param("id"))),
	);

async function parseBody<S extends z.ZodType>(c: Ctx, schema: S) {
	const parsed = schema.safeParse(await c.req.json().catch(() => null));
	if (!parsed.success) return { error: z.prettifyError(parsed.error) };
	return { data: parsed.data };
}

async function readTyped<
	S extends z.ZodType<{ type: string; category_id: number }>,
>(c: Ctx, schema: S) {
	const input = await parseBody(c, schema);
	if ("error" in input) return input;
	const category = await c.env.DB.prepare(
		"SELECT type FROM categories WHERE id = ?",
	)
		.bind(input.data.category_id)
		.first<{ type: string }>();
	if (category?.type !== input.data.type) {
		return { error: `Not an ${input.data.type} category` };
	}
	return input;
}

async function write(c: Ctx, statement: D1PreparedStatement, status = 200) {
	try {
		const row = await statement.first<{ id: number }>();
		if (!row) return c.json({ error: "Not found" }, 404);
		return c.json(row, status === 201 ? 201 : 200);
	} catch (err) {
		if (String(err).includes("UNIQUE constraint failed")) {
			return c.json({ error: "That name already exists" }, 409);
		}
		throw err;
	}
}

async function removeUnused(
	c: Ctx,
	table: "accounts" | "categories",
	column: "account_id" | "category_id",
	id: number,
) {
	const used = await c.env.DB.prepare(
		`SELECT
			(SELECT COUNT(*) FROM transactions WHERE ${column} = ?1) AS transactions,
			(SELECT COUNT(*) FROM recurring WHERE ${column} = ?1) AS recurring`,
	)
		.bind(id)
		.first<{ transactions: number; recurring: number }>();
	if (used?.transactions || used?.recurring) {
		return c.json(
			{
				error: `Used by ${used.transactions} transaction(s) and ${used.recurring} recurring item(s)`,
			},
			409,
		);
	}
	const results = await c.env.DB.batch([
		...(table === "categories"
			? [c.env.DB.prepare("DELETE FROM budgets WHERE category_id = ?").bind(id)]
			: []),
		c.env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id),
	]);
	return results.at(-1)?.meta.changes
		? c.body(null, 204)
		: c.json({ error: "Not found" }, 404);
}

async function remove(
	c: Ctx,
	table: "transactions" | "recurring" | "goals" | "corpus_entries",
	id: number,
) {
	const { meta } = await c.env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`)
		.bind(id)
		.run();
	return meta.changes ? c.body(null, 204) : c.json({ error: "Not found" }, 404);
}

const recurringColumns = (r: RecurringInput) => [
	r.type,
	r.description,
	r.amount,
	r.day,
	r.category_id,
	r.account_id,
];

const columns = (t: TransactionInput) => [
	t.type,
	t.date,
	t.budget_month,
	t.amount,
	t.description,
	t.category_id,
	t.account_id,
];

export default app;
