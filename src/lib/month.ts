import type { Account } from "./api";

export { isMonth } from "../../worker/month";

export function toMonth(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function today() {
	const now = new Date();
	return `${toMonth(now)}-${String(now.getDate()).padStart(2, "0")}`;
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

export function defaultMonth() {
	return shiftMonth(toMonth(new Date()), 1);
}

export function monthLabel(month: string) {
	const [y, m] = month.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
		month: "long",
		year: "numeric",
	});
}
