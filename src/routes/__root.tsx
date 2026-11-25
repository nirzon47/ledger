import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	Link,
	Outlet,
} from "@tanstack/react-router";
import {
	CalendarDaysIcon,
	ChartLineIcon,
	EyeIcon,
	EyeOffIcon,
	ReceiptTextIcon,
	SettingsIcon,
	TargetIcon,
} from "lucide-react";
import { AddTransaction } from "@/components/add-transaction";
import { setHidden, useHidden } from "@/lib/privacy";
import { instant, queries } from "@/lib/queries";

const links = [
	{ to: "/", label: "Month", icon: CalendarDaysIcon },
	{ to: "/transactions", label: "Transactions", icon: ReceiptTextIcon },
	{ to: "/trends", label: "Trends", icon: ChartLineIcon },
	{ to: "/goals", label: "Goals", icon: TargetIcon },
	{ to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		loader: ({ context: { queryClient } }) =>
			Promise.all([
				queryClient.ensureQueryData({ ...queries.accounts, ...instant }),
				queryClient.ensureQueryData({ ...queries.categories, ...instant }),
				queryClient.ensureQueryData({ ...queries.suggestions, ...instant }),
			]),
		component: RootLayout,
	},
);

function RootLayout() {
	const hidden = useHidden();
	return (
		<div className="min-h-svh pt-[env(safe-area-inset-top)] pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
			<nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-background pb-[env(safe-area-inset-bottom)] sm:static sm:border-t-0 sm:border-b sm:pb-0">
				<div className="mx-auto flex max-w-5xl sm:gap-1 sm:px-4">
					<span className="hidden items-center pr-4 font-semibold sm:flex">
						Ledger
					</span>
					{links.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							to={to}
							activeOptions={{ exact: to === "/", includeSearch: false }}
							className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground data-[status=active]:text-foreground sm:flex-none sm:flex-row sm:px-3 sm:py-3 sm:text-sm"
						>
							<Icon className="size-5 sm:size-4" />
							{label}
						</Link>
					))}
					<button
						type="button"
						onClick={() => setHidden(!hidden)}
						aria-label={hidden ? "Show amounts" : "Hide amounts"}
						className="ml-auto hidden items-center gap-1.5 px-3 text-sm text-muted-foreground hover:text-foreground sm:flex"
					>
						{hidden ? (
							<EyeIcon className="size-4" />
						) : (
							<EyeOffIcon className="size-4" />
						)}
						{hidden ? "Show amounts" : "Hide amounts"}
					</button>
				</div>
			</nav>
			{/* remounting on toggle re-renders every amount; data comes from the cache */}
			<main key={String(hidden)} className="mx-auto max-w-5xl p-4">
				<Outlet />
			</main>
			<AddTransaction />
		</div>
	);
}
