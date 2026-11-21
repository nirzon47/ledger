import { type FormEvent, useState } from "react";
import { FormActions, MonthStepper } from "@/components/form-parts";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, type PlanInput, type PlanRow } from "@/lib/api";
import { confirmWithHaptic } from "@/lib/haptics";
import { monthLabel } from "@/lib/month";
import { useSave } from "@/lib/use-save";

type Props = {
	initial?: PlanRow;
	suggestedMonth: string;
	taken: string[];
	onDone: () => void;
};

const rupees = (paise?: number | null) =>
	paise == null ? "" : String(paise / 100);
const paise = (value: string) => Math.round(Number(value || 0) * 100);

export function PlanForm({ initial, suggestedMonth, taken, onDone }: Props) {
	const { run, saving, error } = useSave(onDone);
	const [month, setMonth] = useState(initial?.month ?? suggestedMonth);
	const [savings, setSavings] = useState(rupees(initial?.savings));
	const [capex, setCapex] = useState(rupees(initial?.capex));
	const [loan, setLoan] = useState(rupees(initial?.loan));
	const [corpus, setCorpus] = useState(rupees(initial?.corpus));
	const [note, setNote] = useState(initial?.note ?? "");

	function submit(event: FormEvent) {
		event.preventDefault();
		const body: PlanInput = {
			savings: paise(savings),
			capex: paise(capex),
			loan: paise(loan),
			corpus: corpus === "" ? null : paise(corpus),
			note,
		};
		run(() => api(`/plan/${month}`, { method: "PUT", body }));
	}

	function remove() {
		if (
			!initial ||
			!confirmWithHaptic(`Delete the plan for ${monthLabel(initial.month)}?`)
		)
			return;
		run(() => api(`/plan/${initial.month}`, { method: "DELETE" }));
	}

	return (
		<form onSubmit={submit}>
			<FieldGroup className="gap-4">
				{!initial && (
					<Field>
						<FieldTitle>Month</FieldTitle>
						<MonthStepper value={month} onChange={setMonth} />
						{taken.includes(month) && (
							<FieldDescription>
								This month already has a plan. Saving replaces it.
							</FieldDescription>
						)}
					</Field>
				)}
				<div className="grid grid-cols-2 gap-3">
					<Money
						id="savings"
						label="Salary savings"
						value={savings}
						onChange={setSavings}
					/>
					<Money
						id="corpus"
						label="Ending corpus"
						value={corpus}
						onChange={setCorpus}
					/>
					<Money id="capex" label="Capex" value={capex} onChange={setCapex} />
					<Money
						id="loan"
						label="Loan payment"
						value={loan}
						onChange={setLoan}
					/>
				</div>
				<Field>
					<FieldLabel htmlFor="plan-note">Note</FieldLabel>
					<Textarea
						id="plan-note"
						maxLength={500}
						value={note}
						onChange={(e) => setNote(e.target.value)}
					/>
				</Field>
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} onDelete={initial && remove} />
			</FieldGroup>
		</form>
	);
}

type MoneyProps = {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
};

function Money({ id, label, value, onChange }: MoneyProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label} (₹)</FieldLabel>
			<Input
				id={id}
				type="number"
				inputMode="decimal"
				step="0.01"
				min="0"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		</Field>
	);
}
