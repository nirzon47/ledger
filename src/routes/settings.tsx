import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { AccountForm } from "@/components/account-form";
import { CategoryForm } from "@/components/category-form";
import { RecurringCard } from "@/components/recurring-card";
import { Badge } from "@/components/ui/badge";
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
import type { Account, Category } from "@/lib/api";
import { queries, useLists } from "@/lib/queries";

export const Route = createFileRoute("/settings")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(queries.recurring),
	component: Settings,
});

function Settings() {
	const { accounts, categories } = useLists();
	const { data: recurring } = useSuspenseQuery(queries.recurring);
	const [account, setAccount] = useState<Account | "new" | null>(null);
	const [category, setCategory] = useState<{
		type: Category["type"];
		initial?: Category;
	} | null>(null);
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Settings</h1>
			<Card>
				<CardHeader>
					<CardTitle>Accounts</CardTitle>
					<CardAction>
						<Button variant="ghost" size="sm" onClick={() => setAccount("new")}>
							<PlusIcon />
							Add
						</Button>
					</CardAction>
				</CardHeader>
				<CardContent className="space-y-4">
					{(["bank", "card"] as const).map((kind) => (
						<div key={kind}>
							<p className="text-sm text-muted-foreground">
								{kind === "bank" ? "Banks" : "Cards"}
							</p>
							<ul className="divide-y">
								{accounts
									.filter((a) => a.kind === kind)
									.map((a) => (
										<li key={a.id}>
											<button
												type="button"
												onClick={() => setAccount(a)}
												className="flex w-full justify-between py-2 text-left text-sm hover:text-primary"
											>
												<span>{a.name}</span>
												{a.kind === "card" && (
													<span className="text-muted-foreground">
														cycle starts day {a.cycle_start_day}
													</span>
												)}
											</button>
										</li>
									))}
							</ul>
						</div>
					))}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Categories</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{(["expense", "income"] as const).map((type) => (
						<div key={type} className="space-y-2">
							<div className="flex items-center justify-between">
								<p className="text-sm text-muted-foreground">
									{type === "expense" ? "Expense" : "Income"}
								</p>
								<Button
									variant="ghost"
									size="xs"
									onClick={() => setCategory({ type })}
								>
									<PlusIcon />
									Add
								</Button>
							</div>
							<div className="flex flex-wrap gap-2">
								{categories
									.filter((c) => c.type === type)
									.map((c) => (
										<Badge
											key={c.id}
											variant="secondary"
											className="hover:text-primary"
											render={
												<button
													type="button"
													onClick={() => setCategory({ type, initial: c })}
												/>
											}
										>
											{c.name}
										</Badge>
									))}
							</div>
						</div>
					))}
				</CardContent>
			</Card>
			<RecurringCard items={recurring} />
			<Dialog
				open={account !== null}
				onOpenChange={(open) => !open && setAccount(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{account === "new" ? "Add account" : "Edit account"}
						</DialogTitle>
					</DialogHeader>
					{account && (
						<AccountForm
							key={account === "new" ? "new" : account.id}
							initial={account === "new" ? undefined : account}
							onDone={() => setAccount(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
			<Dialog
				open={category !== null}
				onOpenChange={(open) => !open && setCategory(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{category?.initial
								? "Edit category"
								: `Add ${category?.type} category`}
						</DialogTitle>
					</DialogHeader>
					{category && (
						<CategoryForm
							key={category.initial?.id ?? category.type}
							{...category}
							onDone={() => setCategory(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
