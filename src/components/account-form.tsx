import { type FormEvent, useState } from "react";
import { FormActions, Segmented } from "@/components/form-parts";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type Account, type AccountInput, api } from "@/lib/api";
import { useSave } from "@/lib/use-save";

const kinds = [
	{ value: "bank", label: "Bank" },
	{ value: "card", label: "Card" },
] as const;

type Props = { initial?: Account; onDone: () => void };

export function AccountForm({ initial, onDone }: Props) {
	const { run, saving, error } = useSave(onDone);
	const [name, setName] = useState(initial?.name ?? "");
	const [kind, setKind] = useState<Account["kind"]>(initial?.kind ?? "card");
	const [cycleDay, setCycleDay] = useState(
		String(initial?.cycle_start_day ?? 1),
	);

	function submit(event: FormEvent) {
		event.preventDefault();
		const body: AccountInput = {
			name,
			kind,
			cycle_start_day: kind === "card" ? Number(cycleDay) : null,
		};
		run(() =>
			initial
				? api(`/accounts/${initial.id}`, { method: "PUT", body })
				: api("/accounts", { method: "POST", body }),
		);
	}

	function remove() {
		if (!initial || !confirm(`Delete ${initial.name}?`)) return;
		run(() => api(`/accounts/${initial.id}`, { method: "DELETE" }));
	}

	return (
		<form onSubmit={submit}>
			<FieldGroup className="gap-4">
				<Segmented value={kind} options={kinds} onChange={setKind} />
				<Field>
					<FieldLabel htmlFor="account-name">Name</FieldLabel>
					<Input
						id="account-name"
						required
						maxLength={50}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>
				{kind === "card" && (
					<Field>
						<FieldLabel htmlFor="cycle-day">Cycle starts on day</FieldLabel>
						<Input
							id="cycle-day"
							type="number"
							min={1}
							max={31}
							required
							value={cycleDay}
							onChange={(e) => setCycleDay(e.target.value)}
						/>
						<FieldDescription>
							Spends from this day onward count toward next month.
						</FieldDescription>
					</Field>
				)}
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} onDelete={initial && remove} />
			</FieldGroup>
		</form>
	);
}
