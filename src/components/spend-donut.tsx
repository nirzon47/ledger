import { useState } from "react";
import type { CategoryTotal } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

// dataviz reference palette, dark steps; validated against the card surface
const colors = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];
const otherColor = "#898781";

const R = 60;
const STROKE = 18;
const CIRCUMFERENCE = 2 * Math.PI * R;
const GAP = 2;

type Slice = {
	key: number | "other";
	name: string;
	value: number;
	color: string;
};

function toSlices(categories: CategoryTotal[]): Slice[] {
	const spent = categories
		.filter((c) => c.type === "expense" && c.actual > 0)
		.sort((a, b) => b.actual - a.actual);
	const top = spent.slice(0, colors.length);
	const byId = top.map((c) => c.id).sort((a, b) => a - b);
	const slices: Slice[] = top.map((c) => ({
		key: c.id,
		name: c.name,
		value: c.actual,
		color: colors[byId.indexOf(c.id)],
	}));
	const rest = spent.slice(colors.length).reduce((sum, c) => sum + c.actual, 0);
	if (rest > 0) {
		slices.push({
			key: "other",
			name: "Other",
			value: rest,
			color: otherColor,
		});
	}
	return slices;
}

export function SpendDonut({ categories }: { categories: CategoryTotal[] }) {
	const [active, setActive] = useState<Slice["key"] | null>(null);
	const slices = toSlices(categories);
	const total = slices.reduce((sum, s) => sum + s.value, 0);
	if (total === 0) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				No expenses this month.
			</p>
		);
	}
	const share = (value: number) => `${Math.round((value / total) * 100)}%`;
	const starts = slices.map((_, i) =>
		slices.slice(0, i).reduce((sum, s) => sum + s.value, 0),
	);
	const focus = slices.find((s) => s.key === active);

	return (
		<div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
			<div className="relative size-40 shrink-0">
				<svg
					viewBox="0 0 160 160"
					className="size-full -rotate-90"
					role="img"
					aria-label="Expenses split by category"
					onPointerMove={(e) => {
						const key = (e.target as SVGElement).dataset.key;
						setActive(slices.find((s) => String(s.key) === key)?.key ?? null);
					}}
					onPointerLeave={() => setActive(null)}
				>
					{slices.map((s, i) => (
						<circle
							key={s.key}
							data-key={s.key}
							cx={80}
							cy={80}
							r={R}
							fill="none"
							stroke={s.color}
							strokeWidth={STROKE}
							strokeDasharray={`${Math.max((s.value / total) * CIRCUMFERENCE - GAP, 0)} ${CIRCUMFERENCE}`}
							strokeDashoffset={-(starts[i] / total) * CIRCUMFERENCE}
							className={cn(
								"transition-opacity",
								active !== null && active !== s.key && "opacity-30",
							)}
						/>
					))}
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center text-center">
					<span className="text-xs text-muted-foreground">
						{focus ? focus.name : "Spent"}
					</span>
					<span className="font-semibold">
						{formatMoney(focus ? focus.value : total)}
					</span>
					{focus && (
						<span className="text-xs text-muted-foreground">
							{share(focus.value)}
						</span>
					)}
				</div>
			</div>
			<ul className="w-full space-y-1.5 text-sm">
				{slices.map((s) => (
					<li
						key={s.key}
						className={cn(
							"flex items-center gap-2 transition-opacity",
							active !== null && active !== s.key && "opacity-50",
						)}
					>
						<span
							className="size-2.5 shrink-0 rounded-sm"
							style={{ backgroundColor: s.color }}
						/>
						<span className="min-w-0 flex-1 truncate">{s.name}</span>
						<span className="tabular-nums">{formatMoney(s.value)}</span>
						<span className="w-9 text-right text-muted-foreground tabular-nums">
							{share(s.value)}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
