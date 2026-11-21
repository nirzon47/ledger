import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AiSummaryCard } from "@/components/ai-summary-card";
import { BudgetForm } from "@/components/budget-form";
import { DueRecurring } from "@/components/due-recurring";
import { MonthCharts } from "@/components/month-charts";
import { MonthSwitcher } from "@/components/month-switcher";
import { SpendLess } from "@/components/spend-less";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { CategoryTotal } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import {
	defaultMonth,
	monthLabel,
	neighbours,
	toMonth,
	validateMonthSearch,
} from "@/lib/month";
import { ensureMonth, prefetchMonth, queries } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
	validateSearch: validateMonthSearch,
	loaderDeps: ({ search }) => ({ month: search.month ?? defaultMonth() }),
	loader: ({ deps: { month } }) => {
		for (const m of neighbours(month)) prefetchMonth(m);
		return ensureMonth(month);
	},
	component: MonthPage,
});

function MonthPage() {
	const { month } = Route.useLoaderDeps();
	const { data: summary } = useSuspenseQuery(queries.summary(month));
	const { data: due } = useSuspenseQuery(queries.due(month));
	const { data: insights } = useSuspenseQuery(queries.insights(month));
	const [planning, setPlanning] = useState<CategoryTotal | null>(null);
	const left = summary.income - summary.expenses;
	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h1 className="text-2xl font-semibold">Month</h1>
				<MonthSwitcher month={month} />
			</div>
			{month >= toMonth(new Date()) && (
				<AiSummaryCard query={queries.aiMonth(month)} />
			)}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
				<Stat
					label="Income"
					value={summary.income}
					note={`Planned ${formatMoney(summary.planned_income)}`}
				/>
				<Stat
					label="Expenses"
					value={summary.expenses}
					note={`Planned ${formatMoney(summary.planned_expenses)}`}
				/>
				<Stat
					label="Left this month"
					value={left}
					note={`Planned ${formatMoney(summary.planned_income - summary.planned_expenses)}`}
					signed
					className="col-span-2 lg:col-span-1"
				/>
			</div>
			<DueRecurring month={month} items={due} />
			<MonthCharts summary={summary} />
			<SpendLess insights={insights} />
			<div className="grid gap-4 lg:grid-cols-2">
				{(["expense", "income"] as const).map((type) => (
					<CategoryCard
						key={type}
						type={type}
						rows={summary.categories.filter((c) => c.type === type)}
						onPick={setPlanning}
					/>
				))}
			</div>
			<Dialog
				open={planning !== null}
				onOpenChange={(open) => !open && setPlanning(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Plan for {planning?.name} · {monthLabel(month)}
						</DialogTitle>
					</DialogHeader>
					{planning && (
						<BudgetForm
							key={planning.id}
							month={month}
							category={planning}
							onDone={() => setPlanning(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

type StatProps = {
	label: string;
	value: number;
	note?: string;
	signed?: boolean;
	className?: string;
};

function Stat({ label, value, note, signed, className }: StatProps) {
	return (
		<Card size="sm" className={className}>
			<CardHeader>
				<CardDescription>{label}</CardDescription>
				<CardTitle
					className={cn("text-xl tabular-nums", signed && tone(value))}
				>
					{formatMoney(value)}
				</CardTitle>
				{note && <CardDescription className="text-xs">{note}</CardDescription>}
			</CardHeader>
		</Card>
	);
}

type CategoryCardProps = {
	type: CategoryTotal["type"];
	rows: CategoryTotal[];
	onPick: (row: CategoryTotal) => void;
};

const grid =
	"grid grid-cols-3 gap-x-2 text-right sm:grid-cols-[1fr_repeat(3,5.5rem)]";
const nameCell = "col-span-3 truncate text-left sm:col-span-1";

function CategoryCard({ type, rows, onPick }: CategoryCardProps) {
	const diff = (r: { planned: number; actual: number }) =>
		type === "expense" ? r.planned - r.actual : r.actual - r.planned;
	const totals = rows.reduce(
		(sum, r) => ({
			planned: sum.planned + r.planned,
			actual: sum.actual + r.actual,
		}),
		{ planned: 0, actual: 0 },
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>{type === "expense" ? "Expenses" : "Income"}</CardTitle>
			</CardHeader>
			<CardContent className="text-sm tabular-nums">
				<div className={cn(grid, "pb-2 text-xs text-muted-foreground")}>
					<span className="hidden text-left sm:block">Category</span>
					<span>Planned</span>
					<span>Actual</span>
					<span>Diff</span>
				</div>
				<div className={cn(grid, "border-y py-2 font-medium")}>
					<span className={nameCell}>Total</span>
					<span>{formatMoney(totals.planned)}</span>
					<span>{formatMoney(totals.actual)}</span>
					<span className={tone(diff(totals))}>
						{formatMoney(diff(totals))}
					</span>
				</div>
				<ul className="divide-y">
					{rows.map((row) => (
						<li key={row.id}>
							<button
								type="button"
								onClick={() => onPick(row)}
								className={cn(
									grid,
									"w-full py-2 hover:text-chart-2",
									!row.planned && !row.actual && "text-muted-foreground",
								)}
							>
								<span className={nameCell}>{row.name}</span>
								<span>{formatMoney(row.planned)}</span>
								<span>{formatMoney(row.actual)}</span>
								<span className={tone(diff(row))}>
									{formatMoney(diff(row))}
								</span>
							</button>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}

const tone = (value: number) =>
	value > 0 ? "text-chart-2" : value < 0 ? "text-destructive" : undefined;
