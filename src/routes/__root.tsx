import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import {
	CalendarDaysIcon,
	ChartLineIcon,
	ReceiptTextIcon,
	SettingsIcon,
} from "lucide-react";
import { AddTransaction } from "@/components/add-transaction";
import { type Account, api, type Category } from "@/lib/api";

const links = [
	{ to: "/", label: "Month", icon: CalendarDaysIcon },
	{ to: "/transactions", label: "Transactions", icon: ReceiptTextIcon },
	{ to: "/trends", label: "Trends", icon: ChartLineIcon },
	{ to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export const Route = createRootRoute({
	loader: async () => {
		const [accounts, categories] = await Promise.all([
			api<Account[]>("/accounts"),
			api<Category[]>("/categories"),
		]);
		return { accounts, categories };
	},
	staleTime: Number.POSITIVE_INFINITY,
	component: RootLayout,
});

function RootLayout() {
	return (
		<div className="min-h-svh pb-16 sm:pb-0">
			<nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-background sm:static sm:border-t-0 sm:border-b">
				<div className="mx-auto flex max-w-5xl sm:gap-1 sm:px-4">
					<span className="hidden items-center pr-4 font-semibold sm:flex">
						Ledger
					</span>
					{links.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							to={to}
							activeOptions={{ exact: to === "/" }}
							className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground data-[status=active]:text-foreground sm:flex-none sm:flex-row sm:px-3 sm:py-3 sm:text-sm"
						>
							<Icon className="size-5 sm:size-4" />
							{label}
						</Link>
					))}
				</div>
			</nav>
			<main className="mx-auto max-w-5xl p-4">
				<Outlet />
			</main>
			<AddTransaction />
		</div>
	);
}
