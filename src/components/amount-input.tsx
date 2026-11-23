import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculate, hasOperator } from "@/lib/calc";
import { formatMoney } from "@/lib/format";

const operators = [
	{ text: "+", label: "Add" },
	{ text: "-", label: "Subtract" },
	{ text: "×", label: "Multiply" },
	{ text: "÷", label: "Divide" },
];

type Props = {
	id: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
};

// accepts sums like 450+120*2; the form saves the result
export function AmountInput({ id, value, onChange, required }: Props) {
	const ref = useRef<HTMLInputElement>(null);
	const [focused, setFocused] = useState(false);
	const result = calculate(value);
	const isSum = hasOperator(value);
	const invalid = value.trim() !== "" && result === null;

	function insert(text: string) {
		const input = ref.current;
		const start = input?.selectionStart ?? value.length;
		const end = input?.selectionEnd ?? value.length;
		onChange(value.slice(0, start) + text + value.slice(end));
		requestAnimationFrame(() => {
			input?.focus();
			input?.setSelectionRange(start + text.length, start + text.length);
		});
	}

	return (
		<div className="space-y-1">
			<Input
				ref={ref}
				id={id}
				inputMode="decimal"
				autoComplete="off"
				required={required}
				aria-invalid={invalid || undefined}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
			/>
			{(focused || isSum) && (
				<div className="flex items-center justify-between gap-2">
					<div className="flex gap-0.5">
						{operators.map((op) => (
							<Button
								key={op.text}
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label={op.label}
								onPointerDown={(e) => e.preventDefault()}
								onClick={() => insert(op.text)}
							>
								{op.text === "-" ? "−" : op.text}
							</Button>
						))}
					</div>
					{isSum && (
						<span className="truncate text-xs text-muted-foreground tabular-nums">
							{invalid
								? "Can't calculate that"
								: `= ${formatMoney(Math.round((result ?? 0) * 100))}`}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
