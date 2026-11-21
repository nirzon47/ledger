import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { RecurringForm } from "@/components/recurring-form";
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
import type { Recurring } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RecurringCard({ items }: { items: Recurring[] }) {
	const [editing, setEditing] = useState<Recurring | "new" | null>(null);
	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Recurring</CardTitle>
					<CardAction>
						<Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
							<PlusIcon />
							Add
						</Button>
					</CardAction>
				</CardHeader>
				<CardContent>
					{items.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nothing yet. Add EMIs, savings, salary or subscriptions.
						</p>
					) : (
						<ul className="divide-y">
							{items.map((r) => (
								<li key={r.id}>
									<button
										type="button"
										onClick={() => setEditing(r)}
										className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-chart-2"
									>
										<span className="min-w-0">
											<span className="block truncate">{r.description}</span>
											<span className="block text-xs text-muted-foreground">
												Day {r.day} ·{" "}
												{[r.category, r.account].filter(Boolean).join(" · ")}
											</span>
										</span>
										<span
											className={cn(
												"tabular-nums",
												r.type === "income" && "text-chart-2",
											)}
										>
											{r.type === "income" && "+"}
											{formatMoney(r.amount)}
										</span>
									</button>
								</li>
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
							{editing === "new" ? "Add recurring item" : "Edit recurring item"}
						</DialogTitle>
					</DialogHeader>
					{editing && (
						<RecurringForm
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
