import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionForm } from "@/components/transaction-form";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Transaction } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import {
	defaultMonth,
	monthLabel,
	neighbours,
	validateMonthSearch,
} from "@/lib/month";
import { queries } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
	validateSearch: validateMonthSearch,
	loaderDeps: ({ search }) => ({ month: search.month ?? defaultMonth() }),
	loader: ({ context: { queryClient }, deps: { month } }) => {
		for (const m of neighbours(month)) {
			queryClient.prefetchQuery(queries.transactions(m));
		}
		return queryClient.ensureQueryData(queries.transactions(month));
	},
	component: Transactions,
});

function Transactions() {
	const { month } = Route.useLoaderDeps();
	const { data: transactions } = useSuspenseQuery(queries.transactions(month));
	const [editing, setEditing] = useState<Transaction | null>(null);
	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h1 className="text-2xl font-semibold">Transactions</h1>
				<MonthSwitcher month={month} />
			</div>
			{transactions.length === 0 ? (
				<p className="py-12 text-center text-sm text-muted-foreground">
					No transactions in {monthLabel(month)}.
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className="hidden sm:table-cell">Category</TableHead>
							<TableHead className="hidden sm:table-cell">Account</TableHead>
							<TableHead className="text-right">Amount</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{transactions.map((t) => (
							<TableRow key={t.id} className="relative cursor-pointer">
								<TableCell className="text-muted-foreground">
									{formatDay(t.date)}
								</TableCell>
								<TableCell>
									<button
										type="button"
										onClick={() => setEditing(t)}
										className="text-left after:absolute after:inset-0"
									>
										{t.description}
									</button>
									<span className="block text-xs text-muted-foreground sm:hidden">
										{[t.category, t.account].filter(Boolean).join(" · ")}
									</span>
								</TableCell>
								<TableCell className="hidden sm:table-cell">
									{t.category}
								</TableCell>
								<TableCell className="hidden sm:table-cell">
									{t.account ?? "—"}
								</TableCell>
								<TableCell
									className={cn(
										"text-right tabular-nums",
										t.type === "income" && "text-primary",
									)}
								>
									{t.type === "income" && "+"}
									{formatMoney(t.amount)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
			<Dialog
				open={editing !== null}
				onOpenChange={(open) => !open && setEditing(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit transaction</DialogTitle>
					</DialogHeader>
					{editing && (
						<TransactionForm
							key={editing.id}
							initial={editing}
							onSaved={() => setEditing(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
