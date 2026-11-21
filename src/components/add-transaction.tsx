import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { TransactionForm } from "@/components/transaction-form";
import { buttonVariants } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function AddTransaction() {
	const [open, setOpen] = useState(false);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				aria-label="Add transaction"
				className={cn(
					buttonVariants({ size: "icon-lg" }),
					"fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 size-14 shadow-lg sm:bottom-6",
				)}
			>
				<PlusIcon className="size-6" />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add transaction</DialogTitle>
				</DialogHeader>
				<TransactionForm onSaved={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}
