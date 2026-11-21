import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { GoalForm } from "@/components/goal-form";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Goal } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { monthLabel, toMonth } from "@/lib/month";
import { queries } from "@/lib/queries";
import { cn } from "@/lib/utils";

const relative = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });

function monthsAway(month: string) {
	const [y, m] = month.split("-").map(Number);
	const [cy, cm] = toMonth(new Date()).split("-").map(Number);
	return y * 12 + m - (cy * 12 + cm);
}

export function MilestonesCard() {
	const { data: goals } = useSuspenseQuery(queries.goals);
	const { data: balances } = useSuspenseQuery(queries.balances);
	const [editing, setEditing] = useState<Goal | "new" | null>(null);
	const total = balances.reduce((sum, b) => sum + b.amount, 0);
	const next = goals.find((g) => !g.done);

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Milestones</CardTitle>
					<CardAction>
						<Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
							<PlusIcon />
							Add
						</Button>
					</CardAction>
				</CardHeader>
				<CardContent>
					{goals.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							Add the big spends you're saving for.
						</p>
					) : (
						<ul className="divide-y">
							{goals.map((g) => {
								const away = monthsAway(g.target_month);
								const funded = Math.min(total / g.amount, 1);
								return (
									<li key={g.id} className="relative space-y-2 py-3 text-sm">
										<div
											className={cn(
												"flex justify-between gap-3",
												g.done && "text-muted-foreground",
											)}
										>
											<span className="min-w-0">
												<button
													type="button"
													onClick={() => setEditing(g)}
													className="flex items-center gap-1.5 text-left after:absolute after:inset-0"
												>
													{g.done ? <CheckIcon className="size-4" /> : null}
													<span className={cn(g.done && "line-through")}>
														{g.name}
													</span>
												</button>
												<span
													className={cn(
														"block text-xs text-muted-foreground",
														!g.done && away < 0 && "text-destructive",
													)}
												>
													{monthLabel(g.target_month)}
													{!g.done &&
														` · ${away < 0 ? "overdue" : relative.format(away, "month")}`}
												</span>
											</span>
											<span className="shrink-0 tabular-nums">
												{formatMoney(g.amount)}
											</span>
										</div>
										{g === next && (
											<div className="space-y-1">
												<div className="h-2 overflow-hidden rounded-full bg-chart-2/20">
													<div
														className="h-full bg-chart-2"
														style={{ width: `${funded * 100}%` }}
													/>
												</div>
												<p className="text-xs text-muted-foreground">
													{formatMoney(Math.min(total, g.amount))} of{" "}
													{formatMoney(g.amount)} funded from your balances (
													{Math.round(funded * 100)}%)
												</p>
											</div>
										)}
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>
			<Dialog
				open={editing !== null}
				onOpenChange={(open) => !open && setEditing(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editing === "new" ? "Add milestone" : "Edit milestone"}
						</DialogTitle>
					</DialogHeader>
					{editing && (
						<GoalForm
							key={editing === "new" ? "new" : editing.id}
							initial={editing === "new" ? undefined : editing}
							onDone={() => setEditing(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
