import { createFileRoute } from "@tanstack/react-router";
import { CorpusCard } from "@/components/corpus-card";
import { MilestonesCard } from "@/components/milestones-card";
import { RoadmapCard } from "@/components/roadmap-card";
import { instant, queries } from "@/lib/queries";

export const Route = createFileRoute("/goals")({
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.ensureQueryData({ ...queries.corpus, ...instant }),
			queryClient.ensureQueryData({ ...queries.goals, ...instant }),
			queryClient.ensureQueryData({ ...queries.plan, ...instant }),
		]),
	component: Goals,
});

function Goals() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Goals</h1>
			<CorpusCard />
			<MilestonesCard />
			<RoadmapCard />
		</div>
	);
}
