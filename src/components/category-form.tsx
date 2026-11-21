import { type FormEvent, useState } from "react";
import { FormActions } from "@/components/form-parts";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type Category, type CategoryInput } from "@/lib/api";
import { useSave } from "@/lib/use-save";

type Props = {
	type: CategoryInput["type"];
	initial?: Category;
	onDone: () => void;
};

export function CategoryForm({ type, initial, onDone }: Props) {
	const { run, saving, error } = useSave(onDone);
	const [name, setName] = useState(initial?.name ?? "");

	function submit(event: FormEvent) {
		event.preventDefault();
		run(() =>
			initial
				? api(`/categories/${initial.id}`, { method: "PUT", body: { name } })
				: api("/categories", {
						method: "POST",
						body: { name, type } satisfies CategoryInput,
					}),
		);
	}

	function remove() {
		if (!initial || !confirm(`Delete ${initial.name}?`)) return;
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
				{error && <FieldError>{error}</FieldError>}
				<FormActions saving={saving} onDelete={initial && remove} />
			</FieldGroup>
		</form>
	);
}
