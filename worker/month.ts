export const isMonth = (value: unknown): value is string =>
	typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
