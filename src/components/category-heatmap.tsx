import { Fragment, useState } from "react";
import type { Category, TrendRow } from "@/lib/api";
import { formatCompact, formatMoney } from "@/lib/format";
import { monthLabel, shortMonth } from "@/lib/month";
import { cn } from "@/lib/utils";

type Props = { months: string[]; rows: TrendRow[]; categories: Category[] };

const shade = (value: number, max: number) =>
	`color-mix(in oklch, var(--chart-2) ${Math.round(20 + (80 * value) / max)}%, transparent)`;

export function CategoryHeatmap({ months, rows, categories }: Props) {
	const [active, setActive] = useState<{ row: number; col: number } | null>(
		null,
	);
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
						const { row, col } = (e.target as HTMLElement).dataset;
						setActive(
							row && col ? { row: Number(row), col: Number(col) } : null,
						);
					}}
					onPointerLeave={() => setActive(null)}
				>
					<span />
					{months.map((m, i) => (
						<span key={m} className="text-center text-muted-foreground">
							{i % labelEvery === 0 ? shortMonth(m) : ""}
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
