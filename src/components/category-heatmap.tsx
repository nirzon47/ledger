import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Category, TrendRow } from "@/lib/api";
import { formatCompact, formatDay, formatMoney } from "@/lib/format";
import { monthInitial, monthLabel, shortMonth } from "@/lib/month";
import { queries } from "@/lib/queries";
import { cn } from "@/lib/utils";

// viewport position of the hovered cell; the list flips to stay on screen
type Anchor = { x: number; y: number; left: boolean; up: boolean };

type Props = { months: string[]; rows: TrendRow[]; categories: Category[] };

const shade = (value: number, max: number) =>
	`color-mix(in oklch, var(--chart-2) ${Math.round(20 + (80 * value) / max)}%, transparent)`;

export function CategoryHeatmap({ months, rows, categories }: Props) {
	const [active, setActive] = useState<{ row: number; col: number } | null>(
		null,
	);
	const [anchor, setAnchor] = useState<Anchor | null>(null);
	const hoveredMonth = anchor && active ? months[active.col] : undefined;
	const { data: monthTransactions } = useQuery({
		...queries.transactions(hoveredMonth ?? months[0]),
		enabled: hoveredMonth !== undefined,
	});

	useEffect(() => {
		if (!anchor) return;
		const hide = () => setAnchor(null);
		window.addEventListener("scroll", hide, { capture: true, passive: true });
		return () => window.removeEventListener("scroll", hide, { capture: true });
	}, [anchor]);
	const lines = categories
		.filter((c) => c.type === "expense")
		.map((c) => {
			const values = months.map(
				(m) =>
					rows.find((r) => r.category_id === c.id && r.month === m)?.total ?? 0,
			);
			return {
				id: c.id,
				name: c.name,
				values,
				total: values.reduce((sum, v) => sum + v, 0),
				max: Math.max(...values),
			};
		})
		.filter((line) => line.total > 0)
		.sort((a, b) => b.total - a.total);

	if (lines.length === 0) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				No expenses in this period.
			</p>
		);
	}

	const labelEvery = Math.ceil(months.length / 12);
	const focus = active && lines[active.row];
	const listed =
		focus && hoveredMonth
			? monthTransactions
					?.filter((t) => t.category_id === focus.id)
					.sort((a, b) => a.date.localeCompare(b.date))
			: undefined;

	return (
		<div className="space-y-3">
			<p className="h-5 truncate text-sm">
				{focus && active ? (
					<>
						<span className="font-semibold tabular-nums">
							{formatMoney(focus.values[active.col])}
						</span>{" "}
						<span className="text-muted-foreground">
							{focus.name} · {monthLabel(months[active.col])}
						</span>
					</>
				) : (
					<span className="text-muted-foreground">
						Hover a cell to see the amount.
					</span>
				)}
			</p>
			<div className="overflow-x-auto">
				<div
					className="grid w-full items-center gap-0.5 text-xs"
					style={{
						gridTemplateColumns: `minmax(6rem, 10rem) repeat(${months.length}, minmax(1.25rem, 1fr)) auto`,
					}}
					role="img"
					aria-label="Expenses per category per month"
					onPointerMove={(e) => {
						const cell = e.target as HTMLElement;
						const { row, col } = cell.dataset;
						const hit =
							row && col ? { row: Number(row), col: Number(col) } : null;
						setActive(hit);
						const hasValue = hit && lines[hit.row].values[hit.col] > 0;
						if (e.pointerType !== "mouse" || !hasValue) {
							setAnchor(null);
							return;
						}
						const rect = cell.getBoundingClientRect();
						const left = rect.right + 300 > window.innerWidth;
						const up = rect.top + 260 > window.innerHeight;
						setAnchor({
							x: left ? rect.left - 8 : rect.right + 8,
							y: up ? rect.bottom : rect.top,
							left,
							up,
						});
					}}
					onPointerLeave={() => {
						setActive(null);
						setAnchor(null);
					}}
				>
					<span />
					{months.map((m, i) => (
						<span
							key={m}
							className="text-center whitespace-nowrap text-muted-foreground"
						>
							{i % labelEvery === 0 && (
								<>
									<span className="sm:hidden">{monthInitial(m)}</span>
									<span className="hidden sm:inline">{shortMonth(m)}</span>
								</>
							)}
						</span>
					))}
					<span className="pl-2 text-right text-muted-foreground">Total</span>
					{lines.map((line, r) => (
						<Fragment key={line.id}>
							<span className="truncate pr-2 text-sm">{line.name}</span>
							{line.values.map((value, c) => (
								<span
									key={months[c]}
									data-row={r}
									data-col={c}
									className={cn(
										"h-6 rounded-sm",
										!value && "bg-muted/40",
										active?.row === r &&
											active.col === c &&
											"ring-2 ring-foreground",
									)}
									style={
										value
											? { backgroundColor: shade(value, line.max) }
											: undefined
									}
								/>
							))}
							<span className="pl-2 text-right text-sm tabular-nums">
								{formatCompact(line.total)}
							</span>
						</Fragment>
					))}
				</div>
			</div>
			{anchor &&
				focus &&
				active &&
				createPortal(
					<div
						className={cn(
							"pointer-events-none fixed z-50 w-72 rounded-lg border bg-popover p-2 text-xs shadow-md",
							anchor.left && "-translate-x-full",
							anchor.up && "-translate-y-full",
						)}
						style={{ left: anchor.x, top: anchor.y }}
					>
						<p className="mb-1 flex justify-between gap-2">
							<span className="truncate text-muted-foreground">
								{focus.name} · {monthLabel(months[active.col])}
							</span>
							<span className="font-semibold tabular-nums">
								{formatMoney(focus.values[active.col])}
							</span>
						</p>
						{listed === undefined ? (
							<p className="text-muted-foreground">Loading…</p>
						) : (
							<ul className="space-y-0.5">
								{listed.slice(0, 8).map((t) => (
									<li key={t.id} className="flex gap-2">
										<span className="w-12 shrink-0 text-muted-foreground">
											{formatDay(t.date)}
										</span>
										<span className="min-w-0 flex-1 truncate">
											{t.description}
										</span>
										<span className="tabular-nums">
											{formatMoney(t.amount)}
										</span>
									</li>
								))}
								{listed.length > 8 && (
									<li className="text-muted-foreground">
										and {listed.length - 8} more
									</li>
								)}
							</ul>
						)}
					</div>,
					document.body,
				)}
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<span>Less</span>
				<span
					className="h-2 w-24 rounded-full"
					style={{
						background: `linear-gradient(to right, ${shade(0, 1)}, ${shade(1, 1)})`,
					}}
				/>
				<span>More, relative to each category's busiest month</span>
			</div>
			<details className="text-sm">
				<summary className="text-muted-foreground">Show as table</summary>
				<div className="mt-2 overflow-x-auto">
					<table className="w-full text-xs tabular-nums">
						<thead className="text-muted-foreground">
							<tr>
								<th className="text-left font-normal">Category</th>
								{months.map((m) => (
									<th key={m} className="px-1 text-right font-normal">
										{shortMonth(m)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{lines.map((line) => (
								<tr key={line.id} className="border-t">
									<td className="py-1 pr-2 whitespace-nowrap">{line.name}</td>
									{line.values.map((value, c) => (
										<td key={months[c]} className="px-1 text-right">
											{value ? formatCompact(value) : "–"}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</details>
		</div>
	);
}
