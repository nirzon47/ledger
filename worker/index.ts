import { type Context, Hono } from "hono";
import { z } from "zod";
import { isMonth } from "./month";
import { type TransactionInput, transactionInput } from "./schemas";
import type { Account, Category, Transaction } from "./types";

const app = new Hono<{ Bindings: Env }>()
	.basePath("/api")
	.get("/health", (c) => c.json({ ok: true }))
	.get("/accounts", async (c) => {
		const { results } = await c.env.DB.prepare(
			"SELECT id, name, kind, cycle_start_day FROM accounts ORDER BY id",
		).all<Account>();
		return c.json(results);
	})
	.get("/categories", async (c) => {
		const { results } = await c.env.DB.prepare(
			"SELECT id, name, type FROM categories ORDER BY id",
		).all<Category>();
		return c.json(results);
	})
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
	.post("/transactions", async (c) => {
		const input = await readTransaction(c);
		if ("error" in input) return c.json(input, 400);
		const row = await c.env.DB.prepare(
			`INSERT INTO transactions
				(type, date, budget_month, amount, description, category_id, account_id)
			VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
		)
			.bind(...columns(input.data))
			.first<{ id: number }>();
		return c.json(row, 201);
	})
	.put("/transactions/:id{[0-9]+}", async (c) => {
		const input = await readTransaction(c);
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
	.delete("/transactions/:id{[0-9]+}", async (c) => {
		const { meta } = await c.env.DB.prepare(
			"DELETE FROM transactions WHERE id = ?",
		)
			.bind(Number(c.req.param("id")))
			.run();
		return meta.changes
			? c.body(null, 204)
			: c.json({ error: "Not found" }, 404);
	});

async function readTransaction(c: Context<{ Bindings: Env }>) {
	const parsed = transactionInput.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsed.success) return { error: z.prettifyError(parsed.error) };
	const category = await c.env.DB.prepare(
		"SELECT type FROM categories WHERE id = ?",
	)
		.bind(parsed.data.category_id)
		.first<{ type: string }>();
	if (category?.type !== parsed.data.type) {
		return { error: `Not an ${parsed.data.type} category` };
	}
	return { data: parsed.data };
}

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
