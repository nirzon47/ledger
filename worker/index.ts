import { Hono } from "hono";
import { z } from "zod";
import { isMonth } from "./month";
import { transactionInput } from "./schemas";
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
		const parsed = transactionInput.safeParse(
			await c.req.json().catch(() => null),
		);
		if (!parsed.success) {
			return c.json({ error: z.prettifyError(parsed.error) }, 400);
		}
		const t = parsed.data;
		const category = await c.env.DB.prepare(
			"SELECT type FROM categories WHERE id = ?",
		)
			.bind(t.category_id)
			.first<{ type: string }>();
		if (category?.type !== t.type) {
			return c.json({ error: `Not an ${t.type} category` }, 400);
		}
		const row = await c.env.DB.prepare(
			`INSERT INTO transactions
				(type, date, budget_month, amount, description, category_id, account_id)
			VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
		)
			.bind(
				t.type,
				t.date,
				t.budget_month,
				t.amount,
				t.description,
				t.category_id,
				t.account_id,
			)
			.first<{ id: number }>();
		return c.json(row, 201);
	});

export default app;
