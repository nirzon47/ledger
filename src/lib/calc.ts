// small recursive-descent calculator for + - × ÷ and brackets; never uses eval
export function calculate(input: string): number | null {
	const src = input
		.replace(/[\s,₹]/g, "")
		.replace(/×/g, "*")
		.replace(/÷/g, "/")
		.replace(/−/g, "-");
	if (!src) return null;
	let i = 0;

	function expression(): number {
		let value = term();
		while (src[i] === "+" || src[i] === "-") {
			const op = src[i++];
			const right = term();
			value = op === "+" ? value + right : value - right;
		}
		return value;
	}

	function term(): number {
		let value = factor();
		while (src[i] === "*" || src[i] === "/") {
			const op = src[i++];
			const right = factor();
			value = op === "*" ? value * right : value / right;
		}
		return value;
	}

	function factor(): number {
		if (src[i] === "-") {
			i++;
			return -factor();
		}
		if (src[i] === "(") {
			i++;
			const value = expression();
			if (src[i++] !== ")") throw new Error("missing )");
			return value;
		}
		const number = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
		if (!number) throw new Error("expected a number");
		i += number[0].length;
		return Number(number[0]);
	}

	try {
		const value = expression();
		return i === src.length && Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

export const hasOperator = (input: string) => /[+*/×÷−]|\d\s*-/.test(input);

export function toPaise(input: string) {
	const value = calculate(input);
	return value === null ? null : Math.round(value * 100);
}
