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
import { api, type Balance, type BalanceInput } from "@/lib/api";
import { toPaise } from "@/lib/calc";
import { today } from "@/lib/month";
import { useSave } from "@/lib/use-save";

type Props = { current: Balance[]; onDone: () => void };

const rupees = (balances: Balance[], kind: Balance["kind"]) => {
	const amount = balances.find((b) => b.kind === kind)?.amount;
	return amount === undefined ? "" : String(amount / 100);
};

const paise = (value: string) =>
	value.trim() === "" ? undefined : toPaise(value);

export function BalanceForm({ current, onDone }: Props) {
	const { run, saving, error } = useSave(onDone);
	const [mf, setMf] = useState(rupees(current, "mf"));
	const [liquid, setLiquid] = useState(rupees(current, "liquid"));

	function submit(event: FormEvent) {
		event.preventDefault();
		const mfPaise = paise(mf);
		const liquidPaise = paise(liquid);
		if (mfPaise === null || liquidPaise === null) return;
		const body: BalanceInput = {
			recorded_on: today(),
			mf: mfPaise,
			liquid: liquidPaise,
		};
		run(() => api("/balances", { method: "POST", body }));
	}

	return (
		<form onSubmit={submit}>
			<FieldGroup className="gap-4">
				<div className="grid grid-cols-2 gap-3">
					<Field>
						<FieldLabel htmlFor="mf">MF principal (₹)</FieldLabel>
						<AmountInput id="mf" value={mf} onChange={setMf} />
					</Field>
					<Field>
						<FieldLabel htmlFor="liquid">Liquid savings (₹)</FieldLabel>
						<AmountInput id="liquid" value={liquid} onChange={setLiquid} />
					</Field>
				</div>
				<FieldDescription>
					Saved as of today. Earlier figures stay in your history.
				</FieldDescription>
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} />
			</FieldGroup>
		</form>
	);
}
