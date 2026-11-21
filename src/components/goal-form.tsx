import { type FormEvent, useState } from "react";
import { FormActions, MonthStepper, Segmented } from "@/components/form-parts";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type Goal, type GoalInput } from "@/lib/api";
import { confirmWithHaptic } from "@/lib/haptics";
import { defaultMonth } from "@/lib/month";
import { useSave } from "@/lib/use-save";

const states = [
	{ value: "upcoming", label: "Upcoming" },
	{ value: "done", label: "Done" },
] as const;

type Props = { initial?: Goal; onDone: () => void };

export function GoalForm({ initial, onDone }: Props) {
	const { run, saving, error } = useSave(onDone);
	const [name, setName] = useState(initial?.name ?? "");
	const [amount, setAmount] = useState(
		initial ? String(initial.amount / 100) : "",
	);
	const [month, setMonth] = useState(initial?.target_month ?? defaultMonth());
	const [state, setState] = useState<"upcoming" | "done">(
		initial?.done ? "done" : "upcoming",
	);

	function submit(event: FormEvent) {
		event.preventDefault();
		const body: GoalInput = {
			name,
			amount: Math.round(Number(amount) * 100),
			target_month: month,
			done: state === "done",
		};
		run(() =>
			initial
				? api(`/goals/${initial.id}`, { method: "PUT", body })
				: api("/goals", { method: "POST", body }),
		);
	}

	function remove() {
		if (!initial || !confirmWithHaptic(`Delete ${initial.name}?`)) return;
		run(() => api(`/goals/${initial.id}`, { method: "DELETE" }));
	}

	return (
		<form onSubmit={submit}>
			<FieldGroup className="gap-4">
				{initial && (
					<Segmented value={state} options={states} onChange={setState} />
				)}
				<Field>
					<FieldLabel htmlFor="goal-name">Name</FieldLabel>
					<Input
						id="goal-name"
						required
						maxLength={100}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="goal-amount">Amount (₹)</FieldLabel>
					<Input
						id="goal-amount"
						type="number"
						inputMode="decimal"
						step="0.01"
						min="0.01"
						required
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldTitle>Target month</FieldTitle>
					<MonthStepper value={month} onChange={setMonth} />
				</Field>
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} onDelete={initial && remove} />
			</FieldGroup>
		</form>
	);
}
