import type { CategoryTotal } from "@/lib/api";
import { formatMoney } from "@/lib/format";

const FIXED = "#898781";
const FLEXIBLE = "var(--chart-2)";

export function FixedFlexible({ categories }: { categories: CategoryTotal[] }) {
	const spent = categories.filter((c) => c.type === "expense" && c.actual > 0);
	const fixed = spent.filter((c) => c.fixed).reduce((s, c) => s + c.actual, 0);
	const flexibleRows = spent
		.filter((c) => !c.fixed)
		.sort((a, b) => b.actual - a.actual);
	const flexible = flexibleRows.reduce((s, c) => s + c.actual, 0);
	const total = fixed + flexible;

	if (total === 0) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				No expenses this month.
			</p>
		);
	}
	const share = (value: number) => `${Math.round((value / total) * 100)}%`;

	return (
		<div className="space-y-4 text-sm">
			<div className="grid grid-cols-2 gap-3">
				<Figure
					color={FIXED}
					label="Fixed"
					value={fixed}
					share={share(fixed)}
				/>
				<Figure
					color={FLEXIBLE}
					label="Flexible"
					value={flexible}
					share={share(flexible)}
				/>
			</div>
			<div className="flex h-2 gap-0.5">
				{fixed > 0 && (
					<span
						className="rounded-full"
						style={{ flexGrow: fixed, backgroundColor: FIXED }}
					/>
				)}
				{flexible > 0 && (
					<span
						className="rounded-full"
						style={{ flexGrow: flexible, backgroundColor: FLEXIBLE }}
					/>
				)}
			</div>
			{flexibleRows.length > 0 && (
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">
						Biggest flexible spends, where cutting back counts
					</p>
					<ul className="divide-y">
						{flexibleRows.slice(0, 4).map((c) => (
							<li key={c.id} className="flex justify-between gap-3 py-1.5">
								<span className="truncate">{c.name}</span>
								<span className="shrink-0 tabular-nums">
									{formatMoney(c.actual)}
									<span className="ml-1.5 text-muted-foreground">
										{Math.round((c.actual / flexible) * 100)}%
									</span>
								</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

type FigureProps = {
	color: string;
	label: string;
	value: number;
	share: string;
};

function Figure({ color, label, value, share }: FigureProps) {
	return (
		<div className="min-w-0">
			<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<span
					className="size-2.5 rounded-sm"
					style={{ backgroundColor: color }}
				/>
				{label} · {share}
			</p>
			<p className="truncate text-base font-semibold">{formatMoney(value)}</p>
		</div>
	);
}
