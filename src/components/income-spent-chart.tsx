import { useState } from "react";
import { formatCompact, formatMoney } from "@/lib/format";
import { monthLabel, shortMonth } from "@/lib/month";
import { cn } from "@/lib/utils";

export type MonthTotals = { month: string; income: number; spent: number };

const series = [
	{ key: "income", label: "Income", color: "#3987e5" },
	{ key: "spent", label: "Spent", color: "#d95926" },
] as const;

function niceMax(value: number) {
	if (value <= 0) return 100;
	const step = 10 ** Math.floor(Math.log10(value));
	const f = value / step;
	return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * step;
}

export function IncomeSpentChart({ data }: { data: MonthTotals[] }) {
	const [active, setActive] = useState<number | null>(null);
	const max = niceMax(Math.max(...data.flatMap((d) => [d.income, d.spent])));
	const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
	const labelEvery = data.length > 12 ? 2 : 1;
	const point = active === null ? null : data[active];

	return (
		<div className="space-y-3">
			<ul className="flex gap-4 text-sm">
				{series.map((s) => (
					<li key={s.key} className="flex items-center gap-1.5">
						<span
							className="size-2.5 rounded-sm"
							style={{ backgroundColor: s.color }}
						/>
						{s.label}
					</li>
				))}
			</ul>
			<div className="flex gap-2">
				<div className="relative h-48 w-12 shrink-0">
					{ticks.map((t) => (
						<span
							key={t}
							className="absolute right-0 translate-y-1/2 text-xs text-muted-foreground tabular-nums"
							style={{ bottom: `${(t / max) * 100}%` }}
						>
							{formatCompact(t)}
						</span>
					))}
				</div>
				<div className="min-w-0 flex-1">
					<div
						className="relative h-48"
						role="img"
						aria-label="Income and spending per month"
						onPointerMove={(e) => {
							const box = e.currentTarget.getBoundingClientRect();
							const i = Math.floor(
								((e.clientX - box.left) / box.width) * data.length,
							);
							setActive(Math.min(Math.max(i, 0), data.length - 1));
						}}
						onPointerLeave={() => setActive(null)}
					>
						{ticks.map((t) => (
							<div
								key={t}
								className="absolute inset-x-0 border-t border-border"
								style={{ bottom: `${(t / max) * 100}%` }}
							/>
						))}
						<div className="absolute inset-0 flex">
							{data.map((d, i) => (
								<div
									key={d.month}
									className={cn(
										"flex flex-1 items-end justify-center gap-0.5 px-0.5",
										active === i && "bg-muted/40",
									)}
								>
									{series.map((s) => (
										<div
											key={s.key}
											className="w-full max-w-6 rounded-t-[4px]"
											style={{
												height: `${(d[s.key] / max) * 100}%`,
												backgroundColor: s.color,
											}}
										/>
									))}
								</div>
							))}
						</div>
						{point && active !== null && (
							<Tooltip
								point={point}
								left={((active + 0.5) / data.length) * 100}
								align={
									active === 0
										? "start"
										: active === data.length - 1
											? "end"
											: "center"
								}
							/>
						)}
					</div>
					<div className="flex pt-1">
						{data.map((d, i) => (
							<span
								key={d.month}
								className="flex-1 truncate text-center text-xs text-muted-foreground"
							>
								{i % labelEvery === 0 ? shortMonth(d.month) : ""}
							</span>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

type TooltipProps = {
	point: MonthTotals;
	left: number;
	align: "start" | "center" | "end";
};

function Tooltip({ point, left, align }: TooltipProps) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute top-0 z-10 w-40 rounded-lg border bg-popover p-2 text-xs shadow-md",
				align === "center" && "-translate-x-1/2",
				align === "end" && "-translate-x-full",
			)}
			style={{ left: `${left}%` }}
		>
			<p className="mb-1 text-muted-foreground">{monthLabel(point.month)}</p>
			{series.map((s) => (
				<p key={s.key} className="flex items-center gap-1.5">
					<span className="h-0.5 w-3" style={{ backgroundColor: s.color }} />
					<span className="font-semibold tabular-nums">
						{formatMoney(point[s.key])}
					</span>
					<span className="text-muted-foreground">{s.label}</span>
				</p>
			))}
			<p className="mt-1 flex gap-1.5 border-t pt-1">
				<span className="font-semibold tabular-nums">
					{formatMoney(point.income - point.spent)}
				</span>
				<span className="text-muted-foreground">Left</span>
			</p>
		</div>
	);
}
