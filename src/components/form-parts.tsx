import { Button } from "@/components/ui/button";

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
