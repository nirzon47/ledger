import { createFileRoute } from "@tanstack/react-router";
import { MonthSwitcher } from "@/components/month-switcher";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api, type CategoryTotal, type Summary } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { defaultMonth, validateMonthSearch } from "@/lib/month";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
	validateSearch: validateMonthSearch,
	loaderDeps: ({ search }) => ({ month: search.month ?? defaultMonth() }),
	loader: async ({ deps }) => ({
		month: deps.month,
		summary: await api<Summary>(`/summary?month=${deps.month}`),
	}),
	component: MonthPage,
});

function MonthPage() {
	const { month, summary } = Route.useLoaderData();
	const left = summary.income - summary.expenses;
	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h1 className="text-2xl font-semibold">Month</h1>
				<MonthSwitcher month={month} />
			</div>
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Stat label="Income" value={summary.income} />
				<Stat label="Expenses" value={summary.expenses} />
				<Stat label="Left this month" value={left} signed />
				<Stat
					label="End balance"
					value={summary.start_balance + left}
					note={`Start ${formatMoney(summary.start_balance)}`}
					signed
				/>
			</div>
			<div className="grid gap-4 lg:grid-cols-2">
				<CategoryCard
					title="Expenses"
					total={summary.expenses}
					rows={summary.categories.filter((c) => c.type === "expense")}
				/>
				<CategoryCard
					title="Income"
					total={summary.income}
					rows={summary.categories.filter((c) => c.type === "income")}
				/>
			</div>
		</div>
	);
}

type StatProps = {
	label: string;
	value: number;
	note?: string;
	signed?: boolean;
};

function Stat({ label, value, note, signed }: StatProps) {
	return (
		<Card size="sm">
			<CardHeader>
				<CardDescription>{label}</CardDescription>
				<CardTitle
					className={cn(
						"text-xl tabular-nums",
						signed && value > 0 && "text-primary",
						signed && value < 0 && "text-destructive",
					)}
				>
					{formatMoney(value)}
				</CardTitle>
				{note && <CardDescription className="text-xs">{note}</CardDescription>}
			</CardHeader>
		</Card>
	);
}

type CategoryCardProps = {
	title: string;
	total: number;
	rows: CategoryTotal[];
};

function CategoryCard({ title, total, rows }: CategoryCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardAction className="text-sm tabular-nums">
					{formatMoney(total)}
				</CardAction>
			</CardHeader>
			<CardContent>
				<ul className="divide-y">
					{rows.map((row) => (
						<li
							key={row.id}
							className={cn(
								"flex justify-between py-2 text-sm",
								row.actual === 0 && "text-muted-foreground",
							)}
						>
							<span>{row.name}</span>
							<span className="tabular-nums">{formatMoney(row.actual)}</span>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
