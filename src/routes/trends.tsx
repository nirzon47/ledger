import { createFileRoute, Link } from "@tanstack/react-router";
import {
	IncomeSpentChart,
	type MonthTotals,
} from "@/components/income-spent-chart";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api, type TrendRow } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { defaultMonth, monthLabel, monthsEnding } from "@/lib/month";

const ranges = [6, 12, 24];

export const Route = createFileRoute("/trends")({
	validateSearch: (search: Record<string, unknown>): { range?: number } =>
		ranges.includes(Number(search.range))
			? { range: Number(search.range) }
			: {},
	loaderDeps: ({ search }) => ({ range: search.range ?? 12 }),
	loader: async ({ deps: { range } }) => {
		const months = monthsEnding(defaultMonth(), range);
		const rows = await api<TrendRow[]>(
			`/trends?from=${months[0]}&to=${months[months.length - 1]}`,
		);
		return { range, months, rows };
	},
	component: Trends,
});

function Trends() {
	const { range, months, rows } = Route.useLoaderData();
	const totals: MonthTotals[] = months.map((month) => {
		const sum = (type: TrendRow["type"]) =>
			rows
				.filter((r) => r.month === month && r.type === type)
				.reduce((total, r) => total + r.total, 0);
		return { month, income: sum("income"), spent: sum("expense") };
	});
	const active = totals.filter((t) => t.income || t.spent);
	const average = (key: "income" | "spent") =>
		active.length
			? active.reduce((sum, t) => sum + t[key], 0) / active.length
			: 0;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h1 className="text-2xl font-semibold">Trends</h1>
				<div className="flex gap-1">
					{ranges.map((r) => (
						<Link
							key={r}
							to="/trends"
							search={{ range: r }}
							className={buttonVariants({
								variant: r === range ? "secondary" : "ghost",
								size: "sm",
							})}
						>
							{r} months
						</Link>
					))}
				</div>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Income vs spent</CardTitle>
					<CardDescription>
						Monthly average: income {formatMoney(average("income"))} · spent{" "}
						{formatMoney(average("spent"))} · left{" "}
						{formatMoney(average("income") - average("spent"))}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<IncomeSpentChart data={totals} />
					<details className="text-sm">
						<summary className="text-muted-foreground">Show as table</summary>
						<table className="mt-2 w-full tabular-nums">
							<thead className="text-xs text-muted-foreground">
								<tr>
									<th className="text-left font-normal">Month</th>
									<th className="text-right font-normal">Income</th>
									<th className="text-right font-normal">Spent</th>
									<th className="text-right font-normal">Left</th>
								</tr>
							</thead>
							<tbody>
								{totals.map((t) => (
									<tr key={t.month} className="border-t">
										<td className="py-1">{monthLabel(t.month)}</td>
										<td className="text-right">{formatMoney(t.income)}</td>
										<td className="text-right">{formatMoney(t.spent)}</td>
										<td className="text-right">
											{formatMoney(t.income - t.spent)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</details>
				</CardContent>
			</Card>
		</div>
	);
}
