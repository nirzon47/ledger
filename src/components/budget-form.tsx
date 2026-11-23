import { type FormEvent, useState } from "react";
import { AmountInput } from "@/components/amount-input";
import { FormActions } from "@/components/form-parts";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { api, type BudgetInput, type CategoryTotal } from "@/lib/api";
import { toPaise } from "@/lib/calc";
import { monthLabel } from "@/lib/month";
import { useSave } from "@/lib/use-save";

type Props = { month: string; category: CategoryTotal; onDone: () => void };

export function BudgetForm({ month, category, onDone }: Props) {
	const { run, saving, error } = useSave(onDone);
	const [amount, setAmount] = useState(
		category.planned ? String(category.planned / 100) : "",
	);

	function submit(event: FormEvent) {
		event.preventDefault();
		const planned = toPaise(amount || "0");
		if (planned === null) return;
		const body: BudgetInput = {
			month,
			category_id: category.id,
			planned,
		};
		run(() => api("/budgets", { method: "PUT", body }));
	}

	return (
		<form onSubmit={submit}>
			<FieldGroup className="gap-4">
				<Field>
					<FieldLabel htmlFor="planned">Planned (₹)</FieldLabel>
					<AmountInput id="planned" value={amount} onChange={setAmount} />
					<FieldDescription>
						Applies from {monthLabel(month)} onward, until you change it.
					</FieldDescription>
				</Field>
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} />
			</FieldGroup>
		</form>
	);
}
