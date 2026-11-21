import { createFileRoute } from "@tanstack/react-router";
import { MonthSwitcher } from "@/components/month-switcher";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api, type Transaction } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import { defaultMonth, isMonth, monthLabel } from "@/lib/month";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
	validateSearch: (search: Record<string, unknown>): { month?: string } =>
		isMonth(search.month) ? { month: search.month } : {},
	loaderDeps: ({ search }) => ({ month: search.month ?? defaultMonth() }),
	loader: async ({ deps }) => ({
		month: deps.month,
		transactions: await api<Transaction[]>(`/transactions?month=${deps.month}`),
	}),
	component: Transactions,
});

function Transactions() {
	const { month, transactions } = Route.useLoaderData();
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
							<TableRow key={t.id}>
								<TableCell className="text-muted-foreground">
									{formatDay(t.date)}
								</TableCell>
								<TableCell>
									{t.description}
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
		</div>
	);
}
