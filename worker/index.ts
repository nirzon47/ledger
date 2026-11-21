import { type Context, Hono } from "hono";
import { z } from "zod";
import { isMonth } from "./month";
import {
	accountInput,
	budgetInput,
	categoryInput,
	categoryRename,
	type RecurringInput,
	recurringInput,
	type TransactionInput,
	transactionInput,
} from "./schemas";
import type {
	Account,
	AccountSpend,
	Category,
	CategoryTotal,
	Insights,
	Recurring,
	Suggestion,
	Summary,
	Transaction,
	TrendRow,
} from "./types";

type Ctx = Context<{ Bindings: Env }>;

const selectRecurring = `SELECT r.id, r.type, r.description, r.amount, r.day,
		r.category_id, c.name AS category, r.account_id, a.name AS account
	FROM recurring r
	JOIN categories c ON c.id = r.category_id
	LEFT JOIN accounts a ON a.id = r.account_id`;

const app = new Hono<{ Bindings: Env }>()
	.basePath("/api")
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
			"SELECT id, name, type FROM categories ORDER BY id",
		).all<Category>();
		return c.json(results);
	})
	.post("/categories", async (c) => {
		const input = await parseBody(c, categoryInput);
		if ("error" in input) return c.json(input, 400);
		return write(
			c,
			c.env.DB.prepare(
				"INSERT INTO categories (name, type) VALUES (?, ?) RETURNING id",
			).bind(input.data.name, input.data.type),
			201,
		);
	})
	.put("/categories/:id{[0-9]+}", async (c) => {
		const input = await parseBody(c, categoryRename);
		if ("error" in input) return c.json(input, 400);
		return write(
			c,
			c.env.DB.prepare(
				"UPDATE categories SET name = ? WHERE id = ? RETURNING id",
			).bind(input.data.name, Number(c.req.param("id"))),
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
		const [start, totals, accounts] = await Promise.all([
			c.env.DB.prepare(
				`SELECT COALESCE(SUM(CASE type WHEN 'income' THEN amount ELSE -amount END), 0)
					AS balance
				FROM transactions WHERE budget_month < ?`,
			)
				.bind(month)
				.first<{ balance: number }>(),
			c.env.DB.prepare(
				`SELECT c.id, c.name, c.type,
					COALESCE((
						SELECT b.planned FROM budgets b
						WHERE b.category_id = c.id AND b.month <= ?1
						ORDER BY b.month DESC LIMIT 1
					), 0) AS planned,
					COALESCE((
						SELECT SUM(t.amount) FROM transactions t
						WHERE t.category_id = c.id AND t.budget_month = ?1
					), 0) AS actual
				FROM categories c
				ORDER BY c.id`,
			)
				.bind(month)
				.all<CategoryTotal>(),
			c.env.DB.prepare(
				`SELECT a.id, COALESCE(a.name, 'No account') AS name,
					SUM(t.amount) AS actual
				FROM transactions t
				LEFT JOIN accounts a ON a.id = t.account_id
				WHERE t.budget_month = ? AND t.type = 'expense'
				GROUP BY t.account_id
				ORDER BY actual DESC`,
			)
				.bind(month)
				.all<AccountSpend>(),
		]);
		const total = (type: Category["type"], key: "planned" | "actual") =>
			totals.results
				.filter((r) => r.type === type)
				.reduce((sum, r) => sum + r[key], 0);
		return c.json({
			start_balance: start?.balance ?? 0,
			income: total("income", "actual"),
			expenses: total("expense", "actual"),
			planned_income: total("income", "planned"),
			planned_expenses: total("expense", "planned"),
			categories: totals.results,
			accounts: accounts.results,
		} satisfies Summary);
	})
	.get("/trends", async (c) => {
		const from = c.req.query("from");
		const to = c.req.query("to");
		if (!isMonth(from) || !isMonth(to)) {
			return c.json({ error: "from and to must be YYYY-MM" }, 400);
		}
		const { results } = await c.env.DB.prepare(
			`SELECT budget_month AS month, category_id, type, SUM(amount) AS total
			FROM transactions
			WHERE budget_month BETWEEN ? AND ?
			GROUP BY budget_month, category_id, type`,
		)
			.bind(from, to)
			.all<TrendRow>();
		return c.json(results);
	})
	.get("/insights", async (c) => {
		const month = c.req.query("month");
		if (!isMonth(month)) return c.json({ error: "month must be YYYY-MM" }, 400);
		const db = c.env.DB;
		const [history, usual, top, recurring] = await Promise.all([
			db
				.prepare(
					`SELECT COUNT(*) AS n FROM (
						SELECT DISTINCT budget_month FROM transactions
						WHERE budget_month < ? ORDER BY budget_month DESC LIMIT 3
					)`,
				)
				.bind(month)
				.first<{ n: number }>(),
			db
				.prepare(
					`WITH prev AS (
						SELECT DISTINCT budget_month FROM transactions
						WHERE budget_month < ?1 ORDER BY budget_month DESC LIMIT 3
					)
					SELECT id, name, actual, usual FROM (
						SELECT c.id, c.name,
							COALESCE((
								SELECT SUM(t.amount) FROM transactions t
								WHERE t.category_id = c.id AND t.budget_month = ?1
							), 0) AS actual,
							ROUND(COALESCE((
								SELECT SUM(t.amount) FROM transactions t
								WHERE t.category_id = c.id
									AND t.budget_month IN (SELECT budget_month FROM prev)
							), 0) * 1.0 / MAX((SELECT COUNT(*) FROM prev), 1)) AS usual
						FROM categories c WHERE c.type = 'expense'
					)
					WHERE actual > usual
					ORDER BY actual - usual DESC
					LIMIT 3`,
				)
				.bind(month)
				.all<Insights["above_usual"][number]>(),
			db
				.prepare(
					`SELECT MIN(description) AS description, COUNT(*) AS times,
						SUM(amount) AS total
					FROM transactions
					WHERE budget_month = ? AND type = 'expense'
					GROUP BY lower(trim(description))
					ORDER BY total DESC
					LIMIT 5`,
				)
				.bind(month)
				.all<Insights["top_descriptions"][number]>(),
			db
				.prepare(
					`SELECT id, description, amount FROM recurring
					WHERE type = 'expense' ORDER BY amount DESC`,
				)
				.all<Insights["recurring"][number]>(),
		]);
		return c.json({
			history_months: history?.n ?? 0,
			above_usual: history?.n ? usual.results : [],
			top_descriptions: top.results,
			recurring: recurring.results,
		} satisfies Insights);
	})
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
			`SELECT description, type, category_id, account_id FROM (
				SELECT description, type, category_id, account_id,
					ROW_NUMBER() OVER latest AS rn,
					COUNT(*) OVER (PARTITION BY type, lower(description)) AS uses
				FROM transactions
				WINDOW latest AS (
					PARTITION BY type, lower(description) ORDER BY date DESC, id DESC
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

async function remove(c: Ctx, table: "transactions" | "recurring", id: number) {
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
