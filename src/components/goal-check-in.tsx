import { useSuspenseQuery } from "@tanstack/react-query";
import { TargetIcon } from "lucide-react";
import { PrivateText } from "@/components/private-text";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { corpusAt, whenLabel } from "@/lib/goals";
import { monthLabel, toMonth } from "@/lib/month";
import { queries } from "@/lib/queries";

export function GoalCheckIn({ month }: { month: string }) {
	const { data: plan } = useSuspenseQuery(queries.plan);
	const { data: goals } = useSuspenseQuery(queries.goals);
	const { data: history } = useSuspenseQuery(queries.balanceHistory);
	const { data: balances } = useSuspenseQuery(queries.balances);
	const row = plan.find((p) => p.month === month);
	const next = goals.find((g) => !g.done && g.target_month >= month);
	if (!row && !next) return null;

	const held = month <= toMonth(new Date()) ? corpusAt(history, month) : null;
	const total = balances.reduce((sum, b) => sum + b.amount, 0);
	const outflows = row
		? [
				row.capex && `Capex ${formatMoney(row.capex)}`,
				row.loan && `Loan ${formatMoney(row.loan)}`,
			].filter(Boolean)
		: [];

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<TargetIcon className="size-4 text-chart-2" />
					Goal check-in
				</CardTitle>
				{row?.note && (
					<CardDescription>
						<PrivateText>{row.note}</PrivateText>
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				{row && (
					<div className="space-y-3">
						<Progress
							label="Savings"
							value={row.saved}
							target={row.savings}
							detail={
								row.savings
									? `${formatMoney(row.saved)} of ${formatMoney(row.savings)} planned`
									: `${formatMoney(row.saved)} saved, none planned`
							}
						/>
						{row.corpus !== null && (
							<p className="flex justify-between gap-3 text-xs">
								<span className="text-muted-foreground">Corpus</span>
								<span className="tabular-nums">
									{formatMoney(row.corpus)} planned
									{held !== null && ` · ${formatMoney(held)} held`}
								</span>
							</p>
						)}
						{outflows.length > 0 && (
							<p className="flex justify-between gap-3 text-xs">
								<span className="text-muted-foreground">Planned outflow</span>
								<span className="tabular-nums">{outflows.join(" · ")}</span>
							</p>
						)}
					</div>
				)}
				{next && (
					<Progress
						label={`Next: ${next.name}`}
						value={total}
						target={next.amount}
						detail={`${formatMoney(Math.min(total, next.amount))} of ${formatMoney(next.amount)} funded · ${monthLabel(next.target_month)}, ${whenLabel(next.target_month)}`}
					/>
				)}
			</CardContent>
		</Card>
	);
}

type ProgressProps = {
	label: string;
	value: number;
	target: number;
	detail: string;
};

function Progress({ label, value, target, detail }: ProgressProps) {
	const share = target ? Math.min(value / target, 1) : 1;
	return (
		<div className="space-y-1">
			<div className="flex justify-between gap-3">
				<span className="truncate">{label}</span>
				<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
					{Math.round(share * 100)}%
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-chart-2/20">
				<div
					className="h-full bg-chart-2"
					style={{ width: `${share * 100}%` }}
				/>
			</div>
			<p className="text-xs text-muted-foreground tabular-nums">{detail}</p>
		</div>
	);
}
