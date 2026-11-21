import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
	loader: async () => {
		const res = await fetch("/api/health");
		return (await res.json()) as { ok: boolean };
	},
	component: Home,
});

function Home() {
	const health = Route.useLoaderData();
	return (
		<main className="mx-auto flex max-w-2xl items-center gap-3 p-6">
			<h1 className="text-2xl font-semibold">Ledger</h1>
			<Badge variant={health.ok ? "secondary" : "destructive"}>
				API {health.ok ? "up" : "down"}
			</Badge>
		</main>
	);
}
