import { Hono } from "hono";
import type { Account, Category } from "./types";

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
	});

export default app;
