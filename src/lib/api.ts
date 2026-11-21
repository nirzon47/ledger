export type { Account, Category } from "../../worker/types";

export async function api<T>(path: string): Promise<T> {
	const res = await fetch(`/api${path}`);
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
	return res.json();
}
