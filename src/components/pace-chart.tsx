import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { DayTotal } from "@/lib/api";
import { niceMax } from "@/lib/chart";
import { formatCompact, formatDay, formatMoney } from "@/lib/format";
import { daysInMonth, shiftMonth, shortMonth, toMonth } from "@/lib/month";
import { queries } from "@/lib/queries";
import { cn } from "@/lib/utils";

// categorical slot 1 for this cycle; de-emphasis grey for the last one
const THIS = "#3987e5";
const LAST = "#898781";

function cumulative(list: DayTotal[], upTo: number) {
	const values: number[] = [];
	let sum = 0;
	for (let day = 1; day <= upTo; day++) {
		sum += list.find((d) => d.day === day)?.total ?? 0;
		values.push(sum);
	}
	return values;
}

export function PaceChart({ month }: { month: string }) {
	const { data: pace } = useSuspenseQuery(queries.pace(month));
	const [hover, setHover] = useState<number | null>(null);

	const cycle = shiftMonth(month, -1);
	const lastCycle = shiftMonth(cycle, -1);
	const days = daysInMonth(cycle);
	const now = toMonth(new Date());
	const today = cycle === now ? new Date().getDate() : cycle < now ? days : 0;
	const current = cumulative(pace.current, today);
	const previous = cumulative(pace.previous, days);

	if (!pace.current.length && !pace.previous.length) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				No card-cycle spends to compare for this month.
			</p>
		);
	}

	const max = niceMax(Math.max(current.at(-1) ?? 0, previous.at(-1) ?? 0));
	const x = (i: number) => (i / (days - 1)) * 100;
	const y = (v: number) => 100 - (v / max) * 100;
	const path = (values: number[]) =>
		values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
	const ticks = [0, max / 2, max];
	const dayTicks = [1, 8, 15, 22, days];
	const sameDay = previous[Math.max(current.length - 1, 0)] ?? 0;

	return (
		<div className="space-y-3">
			<ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
				<li className="flex items-center gap-1.5">
					<span className="h-0.5 w-3" style={{ backgroundColor: THIS }} />
					This cycle ({shortMonth(cycle)}):{" "}
					<span className="font-medium tabular-nums">
						{formatMoney(current.at(-1) ?? 0)}
					</span>
					{today < days && current.length > 0 && " so far"}
				</li>
				<li className="flex items-center gap-1.5 text-muted-foreground">
					<span className="h-0.5 w-3" style={{ backgroundColor: LAST }} />
					Last ({shortMonth(lastCycle)}):{" "}
					<span className="tabular-nums">
						{today < days && current.length > 0
							? `${formatMoney(sameDay)} by day ${current.length}, ${formatMoney(previous.at(-1) ?? 0)} total`
							: formatMoney(previous.at(-1) ?? 0)}
					</span>
				</li>
			</ul>
			<div className="flex gap-2">
				<div className="relative h-40 w-12 shrink-0">
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
						className="relative h-40"
						role="img"
						aria-label="Cumulative card-cycle spending, this cycle against last"
						onPointerMove={(e) => {
							const box = e.currentTarget.getBoundingClientRect();
							const i = Math.round(
								((e.clientX - box.left) / box.width) * (days - 1),
							);
							setHover(Math.min(Math.max(i, 0), days - 1));
						}}
						onPointerLeave={() => setHover(null)}
					>
						{ticks.map((t) => (
							<div
								key={t}
								className="absolute inset-x-0 border-t border-border"
								style={{ bottom: `${(t / max) * 100}%` }}
							/>
						))}
						{cycle === now && (
							<div
								className="absolute inset-y-0 border-l border-muted-foreground/40"
								style={{ left: `${x(today - 1)}%` }}
							>
								<span className="absolute -top-0.5 left-1 text-[10px] text-muted-foreground">
									Today
								</span>
							</div>
						)}
						<svg
							viewBox="0 0 100 100"
							preserveAspectRatio="none"
							className="absolute inset-0 size-full overflow-visible"
							aria-hidden="true"
						>
							<path
								d={path(previous)}
								fill="none"
								stroke={LAST}
								strokeWidth={2}
								strokeLinejoin="round"
								vectorEffect="non-scaling-stroke"
							/>
							{current.length > 1 && (
								<path
									d={path(current)}
									fill="none"
									stroke={THIS}
									strokeWidth={2}
									strokeLinejoin="round"
									strokeLinecap="round"
									vectorEffect="non-scaling-stroke"
								/>
							)}
						</svg>
						{current.length > 0 && (
							<span
								className="absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-card"
								style={{
									left: `${x(current.length - 1)}%`,
									bottom: `${100 - y(current.at(-1) ?? 0)}%`,
									backgroundColor: THIS,
								}}
							/>
						)}
						{hover !== null && (
							<>
								<div
									className="pointer-events-none absolute inset-y-0 border-l border-foreground/30"
									style={{ left: `${x(hover)}%` }}
								/>
								<div
									className={cn(
										"pointer-events-none absolute top-0 z-10 w-44 rounded-lg border bg-popover p-2 text-xs shadow-md",
										hover > days / 2 ? "-translate-x-full -ml-2" : "ml-2",
									)}
									style={{ left: `${x(hover)}%` }}
								>
									<p className="mb-1 text-muted-foreground">
										By{" "}
										{formatDay(
											`${cycle}-${String(hover + 1).padStart(2, "0")}`,
										)}
									</p>
									{hover < current.length && (
										<p className="flex items-center gap-1.5">
											<span
												className="h-0.5 w-3"
												style={{ backgroundColor: THIS }}
											/>
											<span className="font-semibold tabular-nums">
												{formatMoney(current[hover])}
											</span>
											<span className="text-muted-foreground">this cycle</span>
										</p>
									)}
									<p className="flex items-center gap-1.5">
										<span
											className="h-0.5 w-3"
											style={{ backgroundColor: LAST }}
										/>
										<span className="font-semibold tabular-nums">
											{formatMoney(previous[hover] ?? 0)}
										</span>
										<span className="text-muted-foreground">last cycle</span>
									</p>
								</div>
							</>
						)}
					</div>
					<div className="relative h-4 pt-1">
						{dayTicks.map((d) => (
							<span
								key={d}
								className="absolute -translate-x-1/2 text-xs text-muted-foreground tabular-nums"
								style={{ left: `${x(d - 1)}%` }}
							>
								{d}
							</span>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
