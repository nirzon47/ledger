export const isMonth = (value: unknown): value is string =>
	typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

export function shiftMonth(month: string, by: number) {
	const [y, m] = month.split("-").map(Number);
	const d = new Date(Date.UTC(y, m - 1 + by, 1));
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
