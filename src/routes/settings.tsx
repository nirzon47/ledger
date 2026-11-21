import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/settings")({
	component: Settings,
});

function Settings() {
	const { accounts, categories } = useLoaderData({ from: "__root__" });
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Settings</h1>
			<Card>
				<CardHeader>
					<CardTitle>Accounts</CardTitle>
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
										<li
											key={a.id}
											className="flex justify-between py-2 text-sm"
										>
											<span>{a.name}</span>
											{a.kind === "card" && (
												<span className="text-muted-foreground">
													cycle starts day {a.cycle_start_day}
												</span>
											)}
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
							<p className="text-sm text-muted-foreground">
								{type === "expense" ? "Expense" : "Income"}
							</p>
							<div className="flex flex-wrap gap-2">
								{categories
									.filter((c) => c.type === type)
									.map((c) => (
										<Badge key={c.id} variant="secondary">
											{c.name}
										</Badge>
									))}
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
