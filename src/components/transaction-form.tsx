import { useLoaderData, useRouter } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
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
import { api, type TransactionInput } from "@/lib/api";
import { budgetMonthFor, monthLabel, shiftMonth, today } from "@/lib/month";

type Type = TransactionInput["type"];

export function TransactionForm({ onSaved }: { onSaved: () => void }) {
	const { accounts, categories } = useLoaderData({ from: "__root__" });
	const router = useRouter();
	const [type, setType] = useState<Type>("expense");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(today);
	const [description, setDescription] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [accountId, setAccountId] = useState("");
	const [monthOverride, setMonthOverride] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const account = accounts.find((a) => String(a.id) === accountId);
	const budgetMonth = monthOverride ?? budgetMonthFor(date || today(), account);

	async function submit(event: FormEvent) {
		event.preventDefault();
		setSaving(true);
		setError(null);
		try {
			await api("/transactions", {
				method: "POST",
				body: {
					type,
					date,
					budget_month: budgetMonth,
					amount: Math.round(Number(amount) * 100),
					description,
					category_id: Number(categoryId),
					account_id: accountId ? Number(accountId) : null,
				} satisfies TransactionInput,
			});
			await router.invalidate();
			onSaved();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	}

	return (
		<form onSubmit={submit}>
			<FieldGroup className="gap-4">
				<div className="grid grid-cols-2 gap-2">
					{(["expense", "income"] as const).map((t) => (
						<Button
							key={t}
							type="button"
							variant={type === t ? "default" : "outline"}
							onClick={() => {
								setType(t);
								setCategoryId("");
							}}
						>
							{t === "expense" ? "Expense" : "Income"}
						</Button>
					))}
				</div>
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
						required
						maxLength={200}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
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
				<Button type="submit" size="lg" disabled={saving}>
					{saving ? "Saving…" : "Save"}
				</Button>
			</FieldGroup>
		</form>
	);
}
