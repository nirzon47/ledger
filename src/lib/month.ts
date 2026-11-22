import { isMonth } from "../../worker/month";
import type { Account } from "./api";

export { isMonth };

export const validateMonthSearch = (
	search: Record<string, unknown>,
): { month?: string } => (isMonth(search.month) ? { month: search.month } : {});

export function toMonth(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function today() {
	const now = new Date();
	return `${toMonth(now)}-${String(now.getDate()).padStart(2, "0")}`;
}

export function recurringDate(month: string, day: number, account?: Account) {
	const start = account?.cycle_start_day;
	const target = start && day >= start ? shiftMonth(month, -1) : month;
	const [y, m] = target.split("-").map(Number);
	const lastDay = new Date(y, m, 0).getDate();
	return `${target}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function budgetMonthFor(date: string, account?: Account) {
	const month = date.slice(0, 7);
	const start = account?.cycle_start_day;
	return start && Number(date.slice(8, 10)) >= start
		? shiftMonth(month, 1)
		: month;
}

export function shiftMonth(month: string, by: number) {
	const [y, m] = month.split("-").map(Number);
	return toMonth(new Date(y, m - 1 + by, 1));
}

export const neighbours = (month: string) => [
	shiftMonth(month, -1),
	shiftMonth(month, 1),
];

export function defaultMonth() {
	return shiftMonth(toMonth(new Date()), 1);
}

export function monthsEnding(end: string, count: number) {
	return Array.from({ length: count }, (_, i) =>
		shiftMonth(end, i - count + 1),
	);
}

export function monthInitial(month: string) {
	const [y, m] = month.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "narrow" });
}

export function shortMonth(month: string) {
	const [y, m] = month.split("-").map(Number);
	const name = new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
		month: "short",
	});
	return m === 1 ? `${name} ${String(y).slice(2)}` : name;
}

export function monthLabel(month: string) {
	const [y, m] = month.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
		month: "long",
		year: "numeric",
	});
}
