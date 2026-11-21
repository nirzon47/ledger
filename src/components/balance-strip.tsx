import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BalanceForm } from "@/components/balance-form";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Balance } from "@/lib/api";
import { formatMoney, relativeDay } from "@/lib/format";
import { queries } from "@/lib/queries";

export function BalanceStrip() {
	const { data: balances } = useSuspenseQuery(queries.balances);
	const [open, setOpen] = useState(false);
	const amount = (kind: Balance["kind"]) =>
		balances.find((b) => b.kind === kind)?.amount ?? 0;
	const updated = balances
		.map((b) => b.recorded_on)
		.sort()
		.at(-1);

	return (
		<>
			<Card size="sm" className="relative">
				<CardContent className="space-y-2">
					<div className="grid grid-cols-3 gap-2">
						<Figure label="MF principal" value={amount("mf")} />
						<Figure label="Liquid savings" value={amount("liquid")} />
						<Figure label="Total" value={amount("mf") + amount("liquid")} />
					</div>
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="text-xs text-muted-foreground after:absolute after:inset-0"
					>
						{updated
							? `Updated ${relativeDay(updated)} · tap to update`
							: "Tap to add your MF principal and liquid savings"}
					</button>
				</CardContent>
			</Card>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Update balances</DialogTitle>
					</DialogHeader>
					{open && (
						<BalanceForm current={balances} onDone={() => setOpen(false)} />
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function Figure({ label, value }: { label: string; value: number }) {
	return (
		<div className="min-w-0">
			<p className="truncate text-xs text-muted-foreground">{label}</p>
			<p className="truncate font-semibold">{formatMoney(value)}</p>
		</div>
	);
}
