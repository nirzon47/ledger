import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Balance, PlanRow } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { monthLabel, toMonth } from "@/lib/month";
import { queries } from "@/lib/queries";
import { cn } from "@/lib/utils";

// MF + liquid as of the end of `month`, carrying earlier figures forward
function corpusAt(history: Balance[], month: string) {
	const latest = { mf: 0, liquid: 0 };
	let found = false;
	for (const b of history) {
		if (b.recorded_on.slice(0, 7) > month) break;
		latest[b.kind] = b.amount;
		found = true;
	}
	return found ? latest.mf + latest.liquid : null;
}

export function RoadmapCard() {
	const { data: plan } = useSuspenseQuery(queries.plan);
	const { data: history } = useSuspenseQuery(queries.balanceHistory);
	const now = toMonth(new Date());

	return (
		<Card>
			<CardHeader>
				<CardTitle>Roadmap</CardTitle>
				<CardDescription>
					Plan vs what you saved and hold (principal only)
				</CardDescription>
			</CardHeader>
			<CardContent>
				{plan.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						Your monthly plan shows up here once it's added.
					</p>
				) : (
					<ul className="space-y-1">
						{plan.map((p) => (
							<Month
								key={p.month}
								row={p}
								now={now}
								corpus={p.month <= now ? corpusAt(history, p.month) : null}
							/>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

type MonthProps = { row: PlanRow; now: string; corpus: number | null };

function Month({ row, now, corpus }: MonthProps) {
	const past = row.month < now;
	// planned corpus includes yield and you track principal, so only savings decide this
	const onTrack = row.saved >= row.savings;
	const outflows = [
		row.capex && `Capex ${formatMoney(row.capex)}`,
		row.loan && `Loan ${formatMoney(row.loan)}`,
	].filter(Boolean);

	return (
		<li
			className={cn(
				"space-y-1 rounded-lg px-2 py-2 text-sm",
				row.month === now && "bg-muted/50",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="font-medium">{monthLabel(row.month)}</span>
				<span className="flex items-center gap-1 text-xs text-muted-foreground">
					{past ? (
						onTrack ? (
							<>
								<CheckIcon className="size-3 text-chart-2" />
								On track
							</>
						) : (
							<>
								<TriangleAlertIcon className="size-3 text-destructive" />
								Behind plan
							</>
						)
					) : row.month === now ? (
						"This month"
					) : null}
				</span>
			</div>
			{row.note && <p className="text-xs text-muted-foreground">{row.note}</p>}
			<dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs tabular-nums">
				<dt className="text-muted-foreground">Savings</dt>
				<dd>
					{formatMoney(row.savings)} planned
					{(row.month <= now || row.saved > 0) &&
						` · ${formatMoney(row.saved)} saved`}
				</dd>
				{row.corpus !== null && (
					<>
						<dt className="text-muted-foreground">Corpus</dt>
						<dd>
							{formatMoney(row.corpus)} planned
							{corpus !== null && ` · ${formatMoney(corpus)} held`}
						</dd>
					</>
				)}
				{outflows.length > 0 && (
					<>
						<dt className="text-muted-foreground">Outflow</dt>
						<dd>{outflows.join(" · ")}</dd>
					</>
				)}
			</dl>
		</li>
	);
}
