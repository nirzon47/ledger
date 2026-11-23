import { type FormEvent, useState } from "react";
import { AmountInput } from "@/components/amount-input";
import { DescriptionInput } from "@/components/description-input";
import {
	CategoryAccountFields,
	FormActions,
	MonthStepper,
	Segmented,
	transactionTypes,
} from "@/components/form-parts";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type Transaction, type TransactionInput } from "@/lib/api";
import { toPaise } from "@/lib/calc";
import { confirmWithHaptic } from "@/lib/haptics";
import { budgetMonthFor, today } from "@/lib/month";
import { useLists } from "@/lib/queries";
import { useSave } from "@/lib/use-save";

type Type = TransactionInput["type"];

type Props = {
	initial?: Transaction;
	preset?: TransactionInput;
	onSaved: () => void;
};

export function TransactionForm({ initial, preset, onSaved }: Props) {
	const { accounts, suggestions } = useLists();
	const { run, saving, error } = useSave(onSaved);
	const from = initial ?? preset;
	const [type, setType] = useState<Type>(from?.type ?? "expense");
	const [amount, setAmount] = useState(from ? String(from.amount / 100) : "");
	const [date, setDate] = useState(from?.date ?? today);
	const [description, setDescription] = useState(from?.description ?? "");
	const [categoryId, setCategoryId] = useState(
		from ? String(from.category_id) : "",
	);
	const [accountId, setAccountId] = useState(
		from?.account_id ? String(from.account_id) : "",
	);
	const [monthOverride, setMonthOverride] = useState(
		from?.budget_month ?? null,
	);
	const account = accounts.find((a) => String(a.id) === accountId);
	const budgetMonth = monthOverride ?? budgetMonthFor(date || today(), account);
	const typeSuggestions = suggestions.filter((s) => s.type === type);

	function changeDescription(value: string) {
		setDescription(value);
		const key = value.trim().toLowerCase();
		const match = typeSuggestions.find(
			(s) => s.description.toLowerCase() === key,
		);
		if (!match) return;
		setCategoryId(String(match.category_id));
		setAccountId(match.account_id ? String(match.account_id) : "");
	}

	function submit(event: FormEvent) {
		event.preventDefault();
		const paise = toPaise(amount);
		if (paise === null) return;
		const body: TransactionInput = {
			type,
			date,
			budget_month: budgetMonth,
			amount: paise,
			description,
			category_id: Number(categoryId),
			account_id: accountId ? Number(accountId) : null,
			recurring_id: preset?.recurring_id ?? null,
		};
		run(() =>
			initial
				? api(`/transactions/${initial.id}`, { method: "PUT", body })
				: api("/transactions", { method: "POST", body }),
		);
	}

	function remove() {
		if (!initial || !confirmWithHaptic(`Delete "${initial.description}"?`))
			return;
		run(() => api(`/transactions/${initial.id}`, { method: "DELETE" }));
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
				<div className="grid grid-cols-2 gap-3">
					<Field>
						<FieldLabel htmlFor="amount">Amount (₹)</FieldLabel>
						<AmountInput
							id="amount"
							value={amount}
							onChange={setAmount}
							required
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="date">Date</FieldLabel>
						<Input
							id="date"
							type="date"
							required
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</Field>
				</div>
				<Field>
					<FieldLabel htmlFor="description">Description</FieldLabel>
					<DescriptionInput
						id="description"
						value={description}
						suggestions={typeSuggestions
							.filter((s) => s.uses > 3)
							.map((s) => s.description)}
						onChange={changeDescription}
					/>
				</Field>
				<CategoryAccountFields
					type={type}
					categoryId={categoryId}
					accountId={accountId}
					onCategory={setCategoryId}
					onAccount={setAccountId}
				/>
				<Field>
					<FieldTitle>Counts toward</FieldTitle>
					<MonthStepper value={budgetMonth} onChange={setMonthOverride} />
				</Field>
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} onDelete={initial && remove} />
			</FieldGroup>
		</form>
	);
}
