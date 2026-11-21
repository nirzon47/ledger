const money = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

export const formatMoney = (paise: number) => money.format(paise / 100);

export function formatDay(date: string) {
	const [y, m, d] = date.split("-").map(Number);
	return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
	});
}
