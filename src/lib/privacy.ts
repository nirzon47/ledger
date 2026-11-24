import { useSyncExternalStore } from "react";
import { haptic } from "./haptics";

export const MASK = "₹••••";

// amounts start hidden on every launch and hide again when the app is left
let hidden = true;
const listeners = new Set<() => void>();

export const isHidden = () => hidden;

export function setHidden(next: boolean) {
	if (next === hidden) return;
	hidden = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export const useHidden = () => useSyncExternalStore(subscribe, isHidden);

export function enablePrivacy() {
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") setHidden(true);
	});
	// tapping a hidden amount reveals everything instead of triggering what's under it
	document.addEventListener(
		"click",
		(event) => {
			if (!hidden) return;
			const target = event.target as Element;
			const masked =
				target.closest?.("[data-private]") ||
				(target.textContent?.includes(MASK) && target.children.length === 0);
			if (!masked) return;
			event.preventDefault();
			event.stopPropagation();
			haptic();
			setHidden(false);
		},
		{ capture: true },
	);
}
