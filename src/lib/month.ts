export { isMonth } from "../../worker/month";

export function toMonth(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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
