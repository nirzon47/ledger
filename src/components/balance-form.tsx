import { type FormEvent, useState } from "react";
import { FormActions } from "@/components/form-parts";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type Balance, type BalanceInput } from "@/lib/api";
import { today } from "@/lib/month";
import { useSave } from "@/lib/use-save";

type Props = { current: Balance[]; onDone: () => void };

const rupees = (balances: Balance[], kind: Balance["kind"]) => {
	const amount = balances.find((b) => b.kind === kind)?.amount;
	return amount === undefined ? "" : String(amount / 100);
};

const paise = (value: string) =>
	value === "" ? undefined : Math.round(Number(value) * 100);

export function BalanceForm({ current, onDone }: Props) {
	const { run, saving, error } = useSave(onDone);
	const [mf, setMf] = useState(rupees(current, "mf"));
	const [liquid, setLiquid] = useState(rupees(current, "liquid"));

	function submit(event: FormEvent) {
		event.preventDefault();
		const body: BalanceInput = {
			recorded_on: today(),
			mf: paise(mf),
			liquid: paise(liquid),
		};
		run(() => api("/balances", { method: "POST", body }));
	}

	return (
		<form onSubmit={submit}>
			<FieldGroup className="gap-4">
				<div className="grid grid-cols-2 gap-3">
					<Field>
						<FieldLabel htmlFor="mf">MF principal (₹)</FieldLabel>
						<Input
							id="mf"
							type="number"
							inputMode="decimal"
							step="0.01"
							min="0"
							value={mf}
							onChange={(e) => setMf(e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="liquid">Liquid savings (₹)</FieldLabel>
						<Input
							id="liquid"
							type="number"
							inputMode="decimal"
							step="0.01"
							min="0"
							value={liquid}
							onChange={(e) => setLiquid(e.target.value)}
						/>
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
