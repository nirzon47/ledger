import type { Balance } from "./api";
import { toMonth } from "./month";

// MF + liquid as of the end of `month`, carrying earlier figures forward
export function corpusAt(history: Balance[], month: string) {
	const latest = { mf: 0, liquid: 0 };
	let found = false;
	for (const b of history) {
		if (b.recorded_on.slice(0, 7) > month) break;
		latest[b.kind] = b.amount;
		found = true;
	}
	return found ? latest.mf + latest.liquid : null;
}

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
