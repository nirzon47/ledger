import { z } from "zod";
import { isMonth } from "./month";

export const transactionInput = z.object({
	type: z.enum(["expense", "income"]),
	date: z.iso.date(),
	budget_month: z.string().refine(isMonth, "Must be YYYY-MM"),
	amount: z.number().int().positive(),
	description: z.string().trim().min(1).max(200),
	category_id: z.number().int(),
	account_id: z.number().int().nullable(),
});

export type TransactionInput = z.infer<typeof transactionInput>;

export const accountInput = z
	.object({
		name: z.string().trim().min(1).max(50),
		kind: z.enum(["bank", "card"]),
		cycle_start_day: z.number().int().min(1).max(31).nullable(),
	})
	.refine(
		(a) => (a.kind === "card") === (a.cycle_start_day !== null),
		"Cards need a cycle day, banks don't",
	);

export type AccountInput = z.infer<typeof accountInput>;
