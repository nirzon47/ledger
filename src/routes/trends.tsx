import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/trends")({
	component: () => <h1 className="text-2xl font-semibold">Trends</h1>,
});
