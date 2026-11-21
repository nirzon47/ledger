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
