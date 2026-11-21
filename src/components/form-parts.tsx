import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
} from "@/components/ui/native-select";
import type { Category } from "@/lib/api";
import { monthLabel, shiftMonth } from "@/lib/month";
import { useLists } from "@/lib/queries";

export const transactionTypes = [
	{ value: "expense", label: "Expense" },
	{ value: "income", label: "Income" },
] as const;

type SegmentedProps<T extends string> = {
	value: T;
	options: readonly { value: T; label: string }[];
	onChange: (value: T) => void;
};

export function Segmented<T extends string>({
	value,
	options,
	onChange,
}: SegmentedProps<T>) {
	return (
		<div className="flex gap-2">
			{options.map((option) => (
				<Button
					key={option.value}
					type="button"
					className="flex-1"
					variant={value === option.value ? "default" : "outline"}
					onClick={() => onChange(option.value)}
				>
					{option.label}
				</Button>
			))}
		</div>
	);
}

type ActionsProps = { saving: boolean; onDelete?: () => void };

export function FormActions({ saving, onDelete }: ActionsProps) {
	return (
		<div className="flex gap-2">
			{onDelete && (
				<Button
					type="button"
					variant="destructive"
					size="lg"
					disabled={saving}
					onClick={onDelete}
				>
					Delete
				</Button>
			)}
			<Button type="submit" size="lg" className="flex-1" disabled={saving}>
				{saving ? "Saving…" : "Save"}
			</Button>
		</div>
	);
}

type CategoryAccountProps = {
	type: Category["type"];
	categoryId: string;
	accountId: string;
	onCategory: (id: string) => void;
	onAccount: (id: string) => void;
};

export function CategoryAccountFields({
	type,
	categoryId,
	accountId,
	onCategory,
	onAccount,
}: CategoryAccountProps) {
	const { accounts, categories } = useLists();
	return (
		<div className="grid grid-cols-2 gap-3">
			<Field>
				<FieldLabel htmlFor="category">Category</FieldLabel>
				<NativeSelect
					id="category"
					className="w-full"
					required
					value={categoryId}
					onChange={(e) => onCategory(e.target.value)}
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
					onChange={(e) => onAccount(e.target.value)}
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
	);
}

type MonthStepperProps = { value: string; onChange: (month: string) => void };

export function MonthStepper({ value, onChange }: MonthStepperProps) {
	return (
		<div className="flex items-center gap-1">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label="Previous month"
				onClick={() => onChange(shiftMonth(value, -1))}
			>
				<ChevronLeftIcon />
			</Button>
			<span className="min-w-36 text-center text-sm font-medium">
				{monthLabel(value)}
			</span>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label="Next month"
				onClick={() => onChange(shiftMonth(value, 1))}
			>
				<ChevronRightIcon />
			</Button>
		</div>
	);
}
