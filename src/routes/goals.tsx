import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BalanceStrip } from "@/components/balance-strip";
import { MilestonesCard } from "@/components/milestones-card";
import { RoadmapCard } from "@/components/roadmap-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Balance } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import { instant, queries } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/goals")({
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.ensureQueryData({ ...queries.balanceHistory, ...instant }),
			queryClient.ensureQueryData({ ...queries.goals, ...instant }),
			queryClient.ensureQueryData({ ...queries.plan, ...instant }),
		]),
	component: Goals,
});

type Snapshot = {
	date: string;
	mf: number;
	liquid: number;
	total: number;
	change: number;
};

// carries the other kind forward so every date shows a full picture
function snapshots(history: Balance[]): Snapshot[] {
	const current = { mf: 0, liquid: 0 };
	const byDate = new Map<string, { mf: number; liquid: number }>();
	for (const b of history) {
		current[b.kind] = b.amount;
		byDate.set(b.recorded_on, { ...current });
	}
	let previous: number | null = null;
	const rows = [...byDate].map(([date, v]) => {
		const total = v.mf + v.liquid;
		const change = previous === null ? 0 : total - previous;
		previous = total;
		return { date, ...v, total, change };
	});
	return rows.reverse();
}

function Goals() {
	const { data: history } = useSuspenseQuery(queries.balanceHistory);
	const rows = snapshots(history);

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Goals</h1>
			<BalanceStrip />
			<MilestonesCard />
			<RoadmapCard />
			<Card>
				<CardHeader>
					<CardTitle>Balance history</CardTitle>
				</CardHeader>
				<CardContent>
					{rows.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							Each balance update shows up here.
						</p>
					) : (
						<ul className="divide-y text-sm">
							{rows.map((r) => (
								<li key={r.date} className="flex justify-between gap-3 py-2">
									<span className="min-w-0">
										<span className="block">{formatDay(r.date)}</span>
										<span className="block truncate text-xs text-muted-foreground">
											MF {formatMoney(r.mf)} · Liquid {formatMoney(r.liquid)}
										</span>
									</span>
									<span className="shrink-0 text-right tabular-nums">
										<span className="block font-medium">
											{formatMoney(r.total)}
										</span>
										{r.change !== 0 && (
											<span
												className={cn(
													"block text-xs",
													r.change > 0 ? "text-chart-2" : "text-destructive",
												)}
											>
												{r.change > 0 && "+"}
												{formatMoney(r.change)}
											</span>
										)}
									</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
