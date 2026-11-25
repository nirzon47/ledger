import { useSuspenseQuery } from "@tanstack/react-query";
import { MinusIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { CorpusForm } from "@/components/corpus-form";
import { Button } from "@/components/ui/button";
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
import { api, type CorpusEvent } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import { currentCorpus } from "@/lib/goals";
import { confirmWithHaptic } from "@/lib/haptics";
import { queries } from "@/lib/queries";
import { useSave } from "@/lib/use-save";
import { cn } from "@/lib/utils";

const kindLabel: Record<CorpusEvent["kind"], string> = {
	set: "Set to actual",
	adjust: "Manual",
	saving: "Saved",
	milestone: "Milestone",
};

export function CorpusCard() {
	const { data: events } = useSuspenseQuery(queries.corpus);
	const [form, setForm] = useState<"set" | "adjust" | null>(null);
	const { run } = useSave(() => {});
	const corpus = currentCorpus(events);

	let total = 0;
	const rows = events.map((e) => {
		total = e.kind === "set" ? e.amount : total + e.amount;
		return { ...e, total };
	});
	let lastSet = -1;
	events.forEach((e, i) => {
		if (e.kind === "set") lastSet = i;
	});
	const since = events.slice(lastSet + 1);
	const sum = (kind: CorpusEvent["kind"]) =>
		since.filter((e) => e.kind === kind).reduce((s, e) => s + e.amount, 0);

	function remove(e: CorpusEvent) {
		if (!confirmWithHaptic(`Remove "${e.label}" from your corpus history?`)) {
			return;
		}
		run(() => api(`/corpus/${e.id}`, { method: "DELETE" }));
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardDescription>Corpus</CardDescription>
					<CardTitle className="text-3xl">{formatMoney(corpus)}</CardTitle>
					{lastSet >= 0 && (
						<CardDescription className="text-xs">
							{formatMoney(events[lastSet].amount)} on{" "}
							{formatDay(events[lastSet].date)} · +{formatMoney(sum("saving"))}{" "}
							saved · {formatMoney(sum("milestone"))} on milestones
							{sum("adjust") !== 0 && ` · ${formatMoney(sum("adjust"))} manual`}
						</CardDescription>
					)}
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-2">
						<Button variant="outline" size="sm" onClick={() => setForm("set")}>
							<RefreshCwIcon />
							Set actual
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setForm("adjust")}
						>
							<PlusIcon />
							<MinusIcon className="-ml-1" />
							Add / withdraw
						</Button>
					</div>
					{rows.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Set your actual corpus once to start; Wealth entries and done
							milestones then move it automatically.
						</p>
					) : (
						<ul className="divide-y text-sm">
							{[...rows].reverse().map((r) => {
								const manual = r.kind === "set" || r.kind === "adjust";
								return (
									<li key={`${r.kind}-${r.id}`} className="relative">
										<div className="flex justify-between gap-3 py-2">
											<span className="min-w-0">
												{manual ? (
													<button
														type="button"
														onClick={() => remove(r)}
														className="block truncate text-left after:absolute after:inset-0"
													>
														{r.label}
													</button>
												) : (
													<span className="block truncate">{r.label}</span>
												)}
												<span className="block text-xs text-muted-foreground">
													{formatDay(r.date)} · {kindLabel[r.kind]}
												</span>
											</span>
											<span className="shrink-0 text-right tabular-nums">
												<span
													className={cn(
														"block",
														r.kind !== "set" && r.amount > 0 && "text-chart-2",
														r.kind !== "set" &&
															r.amount < 0 &&
															"text-destructive",
													)}
												>
													{r.kind === "set"
														? `= ${formatMoney(r.amount)}`
														: `${r.amount > 0 ? "+" : ""}${formatMoney(r.amount)}`}
												</span>
												<span className="block text-xs text-muted-foreground">
													{formatMoney(r.total)}
												</span>
											</span>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>
			<Dialog
				open={form !== null}
				onOpenChange={(open) => !open && setForm(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{form === "set" ? "Set actual corpus" : "Add or withdraw"}
						</DialogTitle>
					</DialogHeader>
					{form && (
						<CorpusForm key={form} kind={form} onDone={() => setForm(null)} />
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
