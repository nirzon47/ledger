import { useLoaderData } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { FormActions, Segmented } from "@/components/form-parts";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
} from "@/components/ui/native-select";
import { api, type Transaction, type TransactionInput } from "@/lib/api";
import { budgetMonthFor, monthLabel, shiftMonth, today } from "@/lib/month";
import { useSave } from "@/lib/use-save";

type Type = TransactionInput["type"];

const types = [
	{ value: "expense", label: "Expense" },
	{ value: "income", label: "Income" },
] as const;

type Props = { initial?: Transaction; onSaved: () => void };

export function TransactionForm({ initial, onSaved }: Props) {
	const { accounts, categories, suggestions } = useLoaderData({
		from: "__root__",
	});
	const { run, saving, error } = useSave(onSaved);
	const [type, setType] = useState<Type>(initial?.type ?? "expense");
	const [amount, setAmount] = useState(
		initial ? String(initial.amount / 100) : "",
	);
	const [date, setDate] = useState(initial?.date ?? today);
	const [description, setDescription] = useState(initial?.description ?? "");
	const [categoryId, setCategoryId] = useState(
		initial ? String(initial.category_id) : "",
	);
	const [accountId, setAccountId] = useState(
		initial?.account_id ? String(initial.account_id) : "",
	);
	const [monthOverride, setMonthOverride] = useState(
		initial?.budget_month ?? null,
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
					options={types}
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
				<div className="grid grid-cols-2 gap-3">
					<Field>
						<FieldLabel htmlFor="category">Category</FieldLabel>
						<NativeSelect
							id="category"
							className="w-full"
							required
							value={categoryId}
							onChange={(e) => setCategoryId(e.target.value)}
						>
							<NativeSelectOption value="" disabled>
								Pick one
							</NativeSelectOption>
							{categories
								.filter((c) => c.type === type)
								.map((c) => (
									<NativeSelectOption key={c.id} value={c.id}>
										{c.name}
									</NativeSelectOption>
								))}
						</NativeSelect>
					</Field>
					<Field>
						<FieldLabel htmlFor="account">Account</FieldLabel>
						<NativeSelect
							id="account"
							className="w-full"
							value={accountId}
							onChange={(e) => setAccountId(e.target.value)}
						>
							<NativeSelectOption value="">None</NativeSelectOption>
							{(["bank", "card"] as const).map((kind) => (
								<NativeSelectOptGroup
									key={kind}
									label={kind === "bank" ? "Banks" : "Cards"}
								>
									{accounts
										.filter((a) => a.kind === kind)
										.map((a) => (
											<NativeSelectOption key={a.id} value={a.id}>
												{a.name}
											</NativeSelectOption>
										))}
								</NativeSelectOptGroup>
							))}
						</NativeSelect>
					</Field>
				</div>
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
