import { type FormEvent, useState } from "react";
import {
	CategoryAccountFields,
	FormActions,
	Segmented,
	transactionTypes,
} from "@/components/form-parts";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type Recurring, type RecurringInput } from "@/lib/api";
import { confirmWithHaptic } from "@/lib/haptics";
import { useSave } from "@/lib/use-save";

type Props = { initial?: Recurring; onDone: () => void };

export function RecurringForm({ initial, onDone }: Props) {
	const { run, saving, error } = useSave(onDone);
	const [type, setType] = useState<Recurring["type"]>(
		initial?.type ?? "expense",
	);
	const [description, setDescription] = useState(initial?.description ?? "");
	const [amount, setAmount] = useState(
		initial ? String(initial.amount / 100) : "",
	);
	const [day, setDay] = useState(String(initial?.day ?? 1));
	const [categoryId, setCategoryId] = useState(
		initial ? String(initial.category_id) : "",
	);
	const [accountId, setAccountId] = useState(
		initial?.account_id ? String(initial.account_id) : "",
	);

	function submit(event: FormEvent) {
		event.preventDefault();
		const body: RecurringInput = {
			type,
			description,
			amount: Math.round(Number(amount) * 100),
			day: Number(day),
			category_id: Number(categoryId),
			account_id: accountId ? Number(accountId) : null,
		};
		run(() =>
			initial
				? api(`/recurring/${initial.id}`, { method: "PUT", body })
				: api("/recurring", { method: "POST", body }),
		);
	}

	function remove() {
		if (!initial || !confirmWithHaptic(`Delete "${initial.description}"?`))
			return;
		run(() => api(`/recurring/${initial.id}`, { method: "DELETE" }));
	}

	return (
		<form onSubmit={submit}>
			<FieldGroup className="gap-4">
				<Segmented
					value={type}
					options={transactionTypes}
					onChange={(t) => {
						setType(t);
						setCategoryId("");
					}}
				/>
				<Field>
					<FieldLabel htmlFor="recurring-description">Description</FieldLabel>
					<Input
						id="recurring-description"
						required
						maxLength={200}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</Field>
				<div className="grid grid-cols-2 gap-3">
					<Field>
						<FieldLabel htmlFor="recurring-amount">Amount (₹)</FieldLabel>
						<Input
							id="recurring-amount"
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
						<FieldLabel htmlFor="recurring-day">Day of month</FieldLabel>
						<Input
							id="recurring-day"
							type="number"
							min={1}
							max={31}
							required
							value={day}
							onChange={(e) => setDay(e.target.value)}
						/>
					</Field>
				</div>
				<CategoryAccountFields
					type={type}
					categoryId={categoryId}
					accountId={accountId}
					onCategory={setCategoryId}
					onAccount={setAccountId}
				/>
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} onDelete={initial && remove} />
			</FieldGroup>
		</form>
	);
}
