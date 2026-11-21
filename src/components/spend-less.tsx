import { ArrowUpIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Insights } from "@/lib/api";
import { formatMoney } from "@/lib/format";

export function SpendLess({ insights }: { insights: Insights }) {
	const monthly = insights.recurring.reduce((sum, r) => sum + r.amount, 0);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Spend less</CardTitle>
				<CardDescription>Where to look first this month</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-6 md:grid-cols-3">
				<Section title="Above your usual">
					{insights.history_months === 0 ? (
						<Note>Needs at least one earlier month to compare with.</Note>
					) : insights.above_usual.length === 0 ? (
						<Note>Nothing above your usual. Nice.</Note>
					) : (
						insights.above_usual.map((c) => (
							<Row
								key={c.id}
								name={c.name}
								value={
									<span className="flex items-center gap-1">
										<ArrowUpIcon className="size-3 text-destructive" />
										{formatMoney(c.actual - c.usual)}
									</span>
								}
								detail={`${formatMoney(c.actual)} vs usual ${formatMoney(c.usual)}`}
							/>
						))
					)}
				</Section>
				<Section title="Top spends">
					{insights.top_descriptions.length === 0 ? (
						<Note>No expenses this month.</Note>
					) : (
						insights.top_descriptions.map((d) => (
							<Row
								key={d.description}
								name={d.description}
								value={formatMoney(d.total)}
								detail={d.times === 1 ? "once" : `${d.times} times`}
							/>
						))
					)}
				</Section>
				<Section title="Recurring costs">
					{insights.recurring.length === 0 ? (
						<Note>
							Add recurring items in Settings to see their yearly cost.
						</Note>
					) : (
						<>
							{insights.recurring.map((r) => (
								<Row
									key={r.id}
									name={r.description}
									value={`${formatMoney(r.amount * 12)}/yr`}
									detail={`${formatMoney(r.amount)}/mo`}
								/>
							))}
							<Row
								name="All recurring"
								value={`${formatMoney(monthly * 12)}/yr`}
								detail={`${formatMoney(monthly)}/mo`}
								strong
							/>
						</>
					)}
				</Section>
			</CardContent>
		</Card>
	);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section>
			<h3 className="mb-1 text-sm text-muted-foreground">{title}</h3>
			<ul className="divide-y">{children}</ul>
		</section>
	);
}

type RowProps = {
	name: string;
	value: ReactNode;
	detail: string;
	strong?: boolean;
};

function Row({ name, value, detail, strong }: RowProps) {
	return (
		<li className={strong ? "py-2 text-sm font-medium" : "py-2 text-sm"}>
			<div className="flex justify-between gap-3">
				<span className="truncate">{name}</span>
				<span className="shrink-0 tabular-nums">{value}</span>
			</div>
			<p className="text-xs text-muted-foreground">{detail}</p>
		</li>
	);
}

function Note({ children }: { children: ReactNode }) {
	return <li className="py-2 text-sm text-muted-foreground">{children}</li>;
}
