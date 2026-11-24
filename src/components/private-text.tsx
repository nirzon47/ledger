import { MASK, useHidden } from "@/lib/privacy";

// ₹9,102 · ₹1,23,456 · ₹40k · ₹1.31L · ₹72.78k · ₹2 Cr (commas only between digits)
const AMOUNT = /(₹\s?\d+(?:,\d+)*(?:\.\d+)?(?:\s?(?:k|K|L|Cr)\b)?)/;
const IS_AMOUNT = new RegExp(`^${AMOUNT.source}$`);

// masks only the rupee amounts inside free text while amounts are hidden
export function PrivateText({ children }: { children: string }) {
	const hidden = useHidden();
	if (!hidden) return children;
	let offset = 0;
	return children.split(AMOUNT).map((part) => {
		const at = offset;
		offset += part.length;
		return IS_AMOUNT.test(part) ? (
			<span key={at} data-private className="cursor-pointer">
				{MASK}
			</span>
		) : (
			<span key={at}>{part}</span>
		);
	});
}
