// rounds an axis maximum up to 1, 2 or 5 times a power of ten
export function niceMax(value: number) {
	if (value <= 0) return 100;
	const step = 10 ** Math.floor(Math.log10(value));
	const f = value / step;
	return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * step;
}
