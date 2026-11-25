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
	fixed: z.boolean().optional(),
	savings: z.boolean().optional(),
});

export const categoryRename = categoryInput.pick({
	name: true,
	fixed: true,
	savings: true,
});

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

export const balanceInput = z
	.object({
		recorded_on: z.iso.date(),
		mf: z.number().int().min(0).optional(),
		liquid: z.number().int().min(0).optional(),
	})
	.refine(
		(b) => b.mf !== undefined || b.liquid !== undefined,
		"Nothing to save",
	);

export type BalanceInput = z.infer<typeof balanceInput>;

export const planInput = z.object({
	savings: z.number().int().min(0),
	capex: z.number().int().min(0),
	loan: z.number().int().min(0),
	corpus: z.number().int().min(0).nullable(),
	note: z.string().trim().max(500),
});

export type PlanInput = z.infer<typeof planInput>;

export const corpusInput = z
	.object({
		kind: z.enum(["set", "adjust"]),
		amount: z.number().int(),
		date: z.iso.date(),
		note: z.string().trim().max(200),
	})
	.refine(
		(e) => e.kind === "adjust" || e.amount >= 0,
		"A total can't be negative",
	)
	.refine((e) => e.kind === "set" || e.amount !== 0, "Amount can't be zero");

export type CorpusInput = z.infer<typeof corpusInput>;

export const goalInput = z.object({
	name: z.string().trim().min(1).max(100),
	amount: z.number().int().positive(),
	target_month: z.string().refine(isMonth, "Must be YYYY-MM"),
	done: z.boolean(),
});

export type GoalInput = z.infer<typeof goalInput>;

export const budgetInput = z.object({
	month: z.string().refine(isMonth, "Must be YYYY-MM"),
	category_id: z.number().int(),
	planned: z.number().int().min(0),
});

export type BudgetInput = z.infer<typeof budgetInput>;
