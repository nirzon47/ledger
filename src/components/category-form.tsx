import { type FormEvent, useState } from "react";
import { FormActions, Segmented } from "@/components/form-parts";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type Category, type CategoryInput } from "@/lib/api";
import { confirmWithHaptic } from "@/lib/haptics";
import { useSave } from "@/lib/use-save";

const kinds = [
	{ value: "flexible", label: "Flexible" },
	{ value: "fixed", label: "Fixed" },
	{ value: "savings", label: "Savings" },
] as const;

type Kind = (typeof kinds)[number]["value"];

type Props = {
	type: CategoryInput["type"];
	initial?: Category;
	onDone: () => void;
};

export function CategoryForm({ type, initial, onDone }: Props) {
	const { run, saving, error } = useSave(onDone);
	const [name, setName] = useState(initial?.name ?? "");
	const [kind, setKind] = useState<Kind>(
		initial?.savings ? "savings" : initial?.fixed ? "fixed" : "flexible",
	);

	function submit(event: FormEvent) {
		event.preventDefault();
		const expense = type === "expense";
		const fixed = expense ? kind !== "flexible" : undefined;
		const savings = expense ? kind === "savings" : undefined;
		run(() =>
			initial
				? api(`/categories/${initial.id}`, {
						method: "PUT",
						body: { name, fixed, savings },
					})
				: api("/categories", {
						method: "POST",
						body: { name, type, fixed, savings } satisfies CategoryInput,
					}),
		);
	}

	function remove() {
		if (!initial || !confirmWithHaptic(`Delete ${initial.name}?`)) return;
		run(() => api(`/categories/${initial.id}`, { method: "DELETE" }));
	}

	return (
		<form onSubmit={submit}>
			<FieldGroup className="gap-4">
				<Field>
					<FieldLabel htmlFor="category-name">Name</FieldLabel>
					<Input
						id="category-name"
						required
						maxLength={50}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>
				{type === "expense" && (
					<Field>
						<FieldTitle>Kind</FieldTitle>
						<Segmented value={kind} options={kinds} onChange={setKind} />
						<FieldDescription>
							Flexible is what you could cut back on. Fixed is committed, like
							EMIs or bills. Savings is money set aside, and counts toward your
							roadmap and corpus.
						</FieldDescription>
					</Field>
				)}
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} onDelete={initial && remove} />
			</FieldGroup>
		</form>
	);
}
