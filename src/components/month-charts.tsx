import { TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SpendDonut } from "@/components/spend-donut";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Summary } from "@/lib/api";
import { formatMoney } from "@/lib/format";

export function MonthCharts({ summary }: { summary: Summary }) {
	const expenses = summary.categories.filter((c) => c.type === "expense");
	const planned = expenses.filter((c) => c.planned > 0);

	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<ChartCard title="Spend split" description="Every category this month">
				<SpendDonut categories={summary.categories} />
			</ChartCard>
			<ChartCard title="Planned vs actual" description="Expense categories">
				{planned.length === 0 ? (
					<Empty>
						Set a planned amount on any category in the Expenses table to track
						it here.
					</Empty>
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
