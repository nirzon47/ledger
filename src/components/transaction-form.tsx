import { useLoaderData } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
	CategoryAccountFields,
	FormActions,
	Segmented,
	transactionTypes,
} from "@/components/form-parts";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type Transaction, type TransactionInput } from "@/lib/api";
import { budgetMonthFor, monthLabel, shiftMonth, today } from "@/lib/month";
import { useSave } from "@/lib/use-save";

type Type = TransactionInput["type"];

type Props = {
	initial?: Transaction;
	preset?: TransactionInput;
	onSaved: () => void;
};

export function TransactionForm({ initial, preset, onSaved }: Props) {
	const { accounts, suggestions } = useLoaderData({ from: "__root__" });
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
		const body: TransactionInput = {
			type,
			date,
			budget_month: budgetMonth,
			amount: Math.round(Number(amount) * 100),
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
		if (!initial || !confirm(`Delete "${initial.description}"?`)) return;
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
						<Input
							id="amount"
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
					<Input
						id="description"
						list="description-suggestions"
						autoComplete="off"
						required
						maxLength={200}
						value={description}
						onChange={(e) => changeDescription(e.target.value)}
					/>
					<datalist id="description-suggestions">
						{typeSuggestions.map((s) => (
							<option key={s.description} value={s.description} />
						))}
					</datalist>
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
					<div className="flex items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Previous month"
							onClick={() => setMonthOverride(shiftMonth(budgetMonth, -1))}
						>
							<ChevronLeftIcon />
						</Button>
						<span className="min-w-36 text-center text-sm font-medium">
							{monthLabel(budgetMonth)}
						</span>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Next month"
							onClick={() => setMonthOverride(shiftMonth(budgetMonth, 1))}
						>
							<ChevronRightIcon />
						</Button>
					</div>
				</Field>
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} onDelete={initial && remove} />
			</FieldGroup>
		</form>
	);
}
