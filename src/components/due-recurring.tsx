import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { TransactionForm } from "@/components/transaction-form";
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
import type { Recurring, TransactionInput } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import { recurringDate } from "@/lib/month";
import { useLists } from "@/lib/queries";

type Props = { month: string; items: Recurring[] };

export function DueRecurring({ month, items }: Props) {
	const { accounts } = useLists();
	const [preset, setPreset] = useState<TransactionInput | null>(null);
	if (items.length === 0) return null;

	const toPreset = (r: Recurring): TransactionInput => ({
		type: r.type,
		date: recurringDate(
			month,
			r.day,
			accounts.find((a) => a.id === r.account_id),
		),
		budget_month: month,
		amount: r.amount,
		description: r.description,
		category_id: r.category_id,
		account_id: r.account_id,
		recurring_id: r.id,
	});

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Recurring due</CardTitle>
					<CardDescription>
						Not added for this month yet. Review each before saving.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="divide-y">
						{items.map((r) => {
							const p = toPreset(r);
							return (
								<li
									key={r.id}
									className="flex items-center justify-between gap-3 py-2 text-sm"
								>
									<span className="min-w-0">
										<span className="block truncate">{r.description}</span>
										<span className="block text-xs text-muted-foreground">
											{formatDay(p.date)}
											{r.account && ` · ${r.account}`}
										</span>
									</span>
									<span className="flex items-center gap-2">
										<span className="tabular-nums">
											{formatMoney(r.amount)}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPreset(p)}
										>
											<PlusIcon />
											Add
										</Button>
									</span>
								</li>
							);
						})}
					</ul>
				</CardContent>
			</Card>
			<Dialog
				open={preset !== null}
				onOpenChange={(open) => !open && setPreset(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add {preset?.description}</DialogTitle>
					</DialogHeader>
					{preset && (
						<TransactionForm
							key={preset.recurring_id}
							preset={preset}
							onSaved={() => setPreset(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
