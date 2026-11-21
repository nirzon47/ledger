import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { haptic } from "./haptics";

export function useSave(onDone: () => void) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function run(action: () => Promise<unknown>) {
		setSaving(true);
		setError(null);
		try {
			await action();
			haptic("success");
			await router.invalidate();
			onDone();
		} catch (err) {
			haptic("warning");
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	}

	return { run, saving, error };
}
