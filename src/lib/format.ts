const money = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

export const formatMoney = (paise: number) => money.format(paise / 100);

const compact = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	notation: "compact",
	maximumFractionDigits: 1,
});

export const formatCompact = (paise: number) => compact.format(paise / 100);

const relative = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });

export function relativeDay(date: string) {
	const [y, m, d] = date.split("-").map(Number);
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	const days = Math.round(
		(new Date(y, m - 1, d).getTime() - start.getTime()) / 86_400_000,
	);
	return relative.format(days, "day");
}

export function formatDay(date: string) {
	const [y, m, d] = date.split("-").map(Number);
	return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
	});
}
