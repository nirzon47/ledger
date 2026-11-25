import type { CorpusEvent } from "./api";
import { defaultMonth, toMonth } from "./month";

// replays movements up to `date`: a set resets the total, everything else adds to it
export function corpusThrough(events: CorpusEvent[], date: string) {
	let total: number | null = null;
	for (const e of events) {
		if (e.date > date) break;
		total = e.kind === "set" ? e.amount : (total ?? 0) + e.amount;
	}
	return total;
}

export const corpusAtMonth = (events: CorpusEvent[], month: string) =>
	corpusThrough(events, `${month}-31`);

// counts entries already logged for the open month, like a savings transfer dated the 1st
export const currentCorpus = (events: CorpusEvent[]) =>
	corpusAtMonth(events, defaultMonth()) ?? 0;

const relative = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });

export function monthsAway(month: string) {
	const [y, m] = month.split("-").map(Number);
	const [cy, cm] = toMonth(new Date()).split("-").map(Number);
	return y * 12 + m - (cy * 12 + cm);
}

export function whenLabel(month: string) {
	const away = monthsAway(month);
	return away < 0 ? "overdue" : relative.format(away, "month");
}
