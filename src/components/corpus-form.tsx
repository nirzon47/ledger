import { type FormEvent, useState } from "react";
import { AmountInput } from "@/components/amount-input";
import { FormActions, Segmented } from "@/components/form-parts";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type CorpusInput } from "@/lib/api";
import { toPaise } from "@/lib/calc";
import { today } from "@/lib/month";
import { useSave } from "@/lib/use-save";

const directions = [
	{ value: "add", label: "Add" },
	{ value: "withdraw", label: "Withdraw" },
] as const;

type Props = { kind: CorpusInput["kind"]; onDone: () => void };

export function CorpusForm({ kind, onDone }: Props) {
	const { run, saving, error } = useSave(onDone);
	const [direction, setDirection] = useState<"add" | "withdraw">("add");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(today);
	const [note, setNote] = useState("");

	function submit(event: FormEvent) {
		event.preventDefault();
		const paise = toPaise(amount);
		if (paise === null) return;
		const body: CorpusInput = {
			kind,
			amount:
				kind === "adjust" && direction === "withdraw"
					? -Math.abs(paise)
					: Math.abs(paise),
			date,
			note,
		};
		run(() => api("/corpus", { method: "POST", body }));
	}

	return (
		<form onSubmit={submit}>
			<FieldGroup className="gap-4">
				{kind === "adjust" && (
					<Segmented
						value={direction}
						options={directions}
						onChange={setDirection}
					/>
				)}
				<div className="grid grid-cols-2 gap-3">
					<Field>
						<FieldLabel htmlFor="corpus-amount">
							{kind === "set" ? "Actual total (₹)" : "Amount (₹)"}
						</FieldLabel>
						<AmountInput
							id="corpus-amount"
							value={amount}
							onChange={setAmount}
							required
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="corpus-date">Date</FieldLabel>
						<Input
							id="corpus-date"
							type="date"
							required
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</Field>
				</div>
				<Field>
					<FieldLabel htmlFor="corpus-note">Note</FieldLabel>
					<Input
						id="corpus-note"
						maxLength={200}
						placeholder={kind === "set" ? "e.g. Synced with INDmoney" : ""}
						value={note}
						onChange={(e) => setNote(e.target.value)}
					/>
					<FieldDescription>
						{kind === "set"
							? "Replaces the running total from this date. Later savings and milestones still count on top."
							: "For money moved in or out that isn't a Wealth entry or a milestone."}
					</FieldDescription>
				</Field>
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} />
			</FieldGroup>
		</form>
	);
}
