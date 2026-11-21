import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { monthLabel, shiftMonth } from "@/lib/month";

const arrow = buttonVariants({ variant: "ghost", size: "icon" });

export function MonthSwitcher({ month }: { month: string }) {
	return (
		<div className="flex items-center gap-1">
			<Link
				to="."
				search={{ month: shiftMonth(month, -1) }}
				aria-label="Previous month"
				className={arrow}
			>
				<ChevronLeftIcon />
			</Link>
			<span className="min-w-36 text-center text-sm font-medium">
				{monthLabel(month)}
			</span>
			<Link
				to="."
				search={{ month: shiftMonth(month, 1) }}
				aria-label="Next month"
				className={arrow}
			>
				<ChevronRightIcon />
			</Link>
		</div>
	);
}
