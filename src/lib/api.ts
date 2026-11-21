export type {
	AccountInput,
	CategoryInput,
	TransactionInput,
} from "../../worker/schemas";
export type {
	Account,
	Category,
	Suggestion,
	Transaction,
} from "../../worker/types";

export async function api<T>(
	path: string,
	init?: { method: string; body?: unknown },
): Promise<T> {
	const res = await fetch(
		`/api${path}`,
		init && {
			method: init.method,
			headers: { "content-type": "application/json" },
			body: init.body === undefined ? undefined : JSON.stringify(init.body),
		},
	);
	if (!res.ok) {
		const data = await res.json().catch(() => null);
		throw new Error(data?.error ?? `${res.status} ${res.statusText}`);
	}
	return res.status === 204 ? (undefined as T) : res.json();
}
