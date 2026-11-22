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
	fixed: 0 | 1;
};

export type CategoryTotal = Category & { planned: number; actual: number };

export type AccountSpend = { id: number | null; name: string; actual: number };

export type Summary = {
	income: number;
	expenses: number;
	planned_income: number;
	planned_expenses: number;
	categories: CategoryTotal[];
	accounts: AccountSpend[];
};

export type AiSummary = { content: string; generated_at: string };

export type DayTotal = { day: number; total: number };

export type Pace = { current: DayTotal[]; previous: DayTotal[] };

export type PlanRow = {
	month: string;
	savings: number;
	capex: number;
	loan: number;
	corpus: number | null;
	note: string;
	saved: number;
};

export type Goal = {
	id: number;
	name: string;
	amount: number;
	target_month: string;
	done: 0 | 1;
};

export type Balance = {
	kind: "mf" | "liquid";
	amount: number;
	recorded_on: string;
};

export type TrendRow = {
	month: string;
	category_id: number;
	type: "expense" | "income";
	total: number;
};

export type Insights = {
	history_months: number;
	above_usual: { id: number; name: string; actual: number; usual: number }[];
	top_descriptions: { description: string; times: number; total: number }[];
	recurring: { id: number; description: string; amount: number }[];
};

export type Recurring = {
	id: number;
	type: "expense" | "income";
	description: string;
	amount: number;
	day: number;
	category_id: number;
	category: string;
	account_id: number | null;
	account: string | null;
};

export type Suggestion = {
	description: string;
	type: "expense" | "income";
	category_id: number;
	account_id: number | null;
	uses: number;
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
