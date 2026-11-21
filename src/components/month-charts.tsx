import { TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Summary } from "@/lib/api";
import { formatMoney } from "@/lib/format";

type Bar = { key: string | number; name: string; value: number };

export function MonthCharts({ summary }: { summary: Summary }) {
	const expenses = summary.categories.filter((c) => c.type === "expense");
	const byCategory = expenses
		.filter((c) => c.actual > 0)
		.map((c) => ({ key: c.id, name: c.name, value: c.actual }))
		.sort((a, b) => b.value - a.value);
	const byAccount = summary.accounts.map((a) => ({
		key: a.id ?? "none",
		name: a.name,
		value: a.actual,
	}));
	const planned = expenses.filter((c) => c.planned > 0);

	return (
		<div className="grid gap-4 lg:grid-cols-3">
			<ChartCard title="Where it went" description="Expenses by category">
				<BarList bars={byCategory} total={summary.expenses} />
			</ChartCard>
			<ChartCard title="Paid with" description="Expenses by account">
				<BarList bars={byAccount} total={summary.expenses} />
			</ChartCard>
			<ChartCard title="Planned vs actual" description="Expense categories">
				{planned.length === 0 ? (
					<Empty>Tap a category below to set a planned amount.</Empty>
				) : (
					<ul className="space-y-3">
						{planned.map((c) => (
							<Meter
								key={c.id}
								name={c.name}
								planned={c.planned}
								actual={c.actual}
							/>
						))}
					</ul>
				)}
			</ChartCard>
		</div>
	);
}

type ChartCardProps = {
	title: string;
	description: string;
	children: ReactNode;
};

function ChartCard({ title, description, children }: ChartCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function BarList({ bars, total }: { bars: Bar[]; total: number }) {
	if (bars.length === 0) return <Empty>No expenses this month.</Empty>;
	const max = Math.max(...bars.map((b) => b.value));
	return (
		<ul className="space-y-3">
			{bars.map((bar) => (
				<li key={bar.key} className="group space-y-1 text-sm">
					<div className="flex justify-between gap-3">
						<span className="truncate">{bar.name}</span>
						<span className="shrink-0 tabular-nums">
							{formatMoney(bar.value)}
							<span className="ml-1.5 text-muted-foreground">
								{Math.round((bar.value / total) * 100)}%
							</span>
						</span>
					</div>
					<div className="h-2">
						<div
							className="h-full rounded-r-[4px] bg-chart-2 transition-opacity group-hover:opacity-80"
							style={{ width: `${(bar.value / max) * 100}%` }}
						/>
					</div>
				</li>
			))}
		</ul>
	);
}

type MeterProps = { name: string; planned: number; actual: number };

function Meter({ name, planned, actual }: MeterProps) {
	const over = actual - planned;
	return (
		<li className="space-y-1 text-sm">
			<div className="flex justify-between gap-3">
				<span className="truncate">{name}</span>
				<span className="shrink-0 tabular-nums">
					{formatMoney(actual)}
					<span className="text-muted-foreground">
						{" "}
						of {formatMoney(planned)}
					</span>
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-chart-2/20">
				<div
					className={over > 0 ? "h-full bg-destructive" : "h-full bg-chart-2"}
					style={{ width: `${Math.min(actual / planned, 1) * 100}%` }}
				/>
			</div>
			{over > 0 && (
				<p className="flex items-center gap-1 text-xs text-muted-foreground">
					<TriangleAlertIcon className="size-3 text-destructive" />
					Over by {formatMoney(over)}
				</p>
			)}
		</li>
	);
}

function Empty({ children }: { children: ReactNode }) {
	return (
		<p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
	);
}
