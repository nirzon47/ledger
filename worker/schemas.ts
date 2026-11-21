import { z } from "zod";
import { isMonth } from "./month";

export const transactionInput = z.object({
	type: z.enum(["expense", "income"]),
	date: z.iso.date(),
	budget_month: z.string().refine(isMonth, "Must be YYYY-MM"),
	amount: z
		.number()
		.int()
		.refine((n) => n !== 0, "Amount can't be zero"),
	description: z.string().trim().min(1).max(200),
	category_id: z.number().int(),
	account_id: z.number().int().nullable(),
	recurring_id: z.number().int().nullable(),
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

export const categoryInput = z.object({
	name: z.string().trim().min(1).max(50),
	type: z.enum(["expense", "income"]),
});

export const categoryRename = categoryInput.pick({ name: true });

export type CategoryInput = z.infer<typeof categoryInput>;

export const recurringInput = transactionInput
	.pick({
		type: true,
		description: true,
		amount: true,
		category_id: true,
		account_id: true,
	})
	.extend({
		amount: z.number().int().positive(),
		day: z.number().int().min(1).max(31),
	});

export type RecurringInput = z.infer<typeof recurringInput>;

export const budgetInput = z.object({
	month: z.string().refine(isMonth, "Must be YYYY-MM"),
	category_id: z.number().int(),
	planned: z.number().int().min(0),
});

export type BudgetInput = z.infer<typeof budgetInput>;
