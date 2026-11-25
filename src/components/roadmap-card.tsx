import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { PlanForm } from "@/components/plan-form";
import { PrivateText } from "@/components/private-text";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
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
import type { PlanRow } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { corpusAtMonth } from "@/lib/goals";
import { defaultMonth, monthLabel, shiftMonth, toMonth } from "@/lib/month";
import { queries } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function RoadmapCard() {
	const { data: plan } = useSuspenseQuery(queries.plan);
	const { data: events } = useSuspenseQuery(queries.corpus);
	const open = defaultMonth();
	const now = toMonth(new Date());
	const [editing, setEditing] = useState<PlanRow | "new" | null>(null);
	const last = plan.at(-1)?.month;

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Roadmap</CardTitle>
					<CardDescription>
						Plan vs what you saved and your corpus
					</CardDescription>
					<CardAction>
						<Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
							<PlusIcon />
							Add month
						</Button>
					</CardAction>
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
									corpus={
										p.month <= open ? corpusAtMonth(events, p.month) : null
									}
									onEdit={() => setEditing(p)}
								/>
							))}
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
							{editing === "new"
								? "Add month to plan"
								: `Plan for ${editing ? monthLabel(editing.month) : ""}`}
						</DialogTitle>
					</DialogHeader>
					{editing && (
						<PlanForm
							key={editing === "new" ? "new" : editing.month}
							initial={editing === "new" ? undefined : editing}
							suggestedMonth={last ? shiftMonth(last, 1) : defaultMonth()}
							taken={plan.map((p) => p.month)}
							onDone={() => setEditing(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

type MonthProps = {
	row: PlanRow;
	now: string;
	corpus: number | null;
	onEdit: () => void;
};

function Month({ row, now, corpus, onEdit }: MonthProps) {
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
				"relative space-y-1 rounded-lg px-2 py-2 text-sm hover:bg-muted/30",
				row.month === now && "bg-muted/50",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<button
					type="button"
					onClick={onEdit}
					className="font-medium after:absolute after:inset-0"
				>
					{monthLabel(row.month)}
				</button>
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
			{row.note && (
				<p className="text-xs text-muted-foreground">
					<PrivateText>{row.note}</PrivateText>
				</p>
			)}
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
