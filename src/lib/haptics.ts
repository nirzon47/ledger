type Haptic = "tap" | "success" | "warning";

const patterns: Record<Haptic, VibratePattern> = {
	tap: 8,
	success: [12, 60, 12],
	warning: [30, 80, 30],
};

const interactive = "button, a[href], [role='option'], select, summary";

export function haptic(kind: Haptic = "tap") {
	if ("vibrate" in navigator) navigator.vibrate(patterns[kind]);
}

export function confirmWithHaptic(message: string) {
	haptic("warning");
	return confirm(message);
}

export function enableTapHaptics() {
	document.addEventListener(
		"click",
		(event) => {
			if ((event.target as Element).closest?.(interactive)) haptic();
		},
		{ capture: true },
	);
}
