import { Autocomplete } from "@base-ui/react/autocomplete";
import { Input } from "@/components/ui/input";

type Props = {
	id: string;
	value: string;
	suggestions: string[];
	onChange: (value: string) => void;
};

export function DescriptionInput({ id, value, suggestions, onChange }: Props) {
	return (
		<Autocomplete.Root
			items={suggestions}
			value={value}
			onValueChange={(next) => onChange(next)}
			openOnInputClick={false}
		>
			<Autocomplete.Input
				id={id}
				required
				maxLength={200}
				autoComplete="off"
				render={<Input />}
			/>
			<Autocomplete.Portal>
				<Autocomplete.Positioner sideOffset={6} className="isolate z-50">
					<Autocomplete.Popup className="w-(--anchor-width) max-w-(--available-width) overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/5 has-data-empty:hidden">
						<Autocomplete.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1">
							{(item: string) => (
								<Autocomplete.Item
									key={item}
									value={item}
									className="cursor-pointer rounded-xl px-3 py-2 text-sm outline-none select-none data-highlighted:bg-foreground/10"
								>
									{item}
								</Autocomplete.Item>
							)}
						</Autocomplete.List>
					</Autocomplete.Popup>
				</Autocomplete.Positioner>
			</Autocomplete.Portal>
		</Autocomplete.Root>
	);
}
