export type Account = {
	id: number;
	name: string;
	kind: "bank" | "card";
	cycle_start_day: number | null;
};

export type Category = {
	id: number;
	name: string;
	type: "expense" | "income";
};

export type Suggestion = {
	description: string;
	type: "expense" | "income";
	category_id: number;
	account_id: number | null;
};

export type Transaction = {
	id: number;
	type: "expense" | "income";
	date: string;
	budget_month: string;
	amount: number;
	description: string;
	category_id: number;
	category: string;
	account_id: number | null;
	account: string | null;
};
