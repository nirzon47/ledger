import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { SparklesIcon } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { AiSummary } from "@/lib/api";

const LABEL = /^(Overview|Unnecessary|Projection|Ideas)\s*:\s*/i;

const ago = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });

function updated(generatedAt: string) {
	const ms = Date.parse(`${generatedAt.replace(" ", "T")}Z`);
	const days = Math.round((ms - Date.now()) / 86_400_000);
	return days === 0 ? "today" : ago.format(days, "day");
}

type Props = {
	query: UseQueryOptions<AiSummary | null, Error, AiSummary | null, string[]>;
};

export function AiSummaryCard({ query }: Props) {
	const { data, isPending, isError } = useQuery(query);
	const lines = data?.content.split("\n").filter((l) => l.trim()) ?? [];

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<SparklesIcon className="size-4 text-chart-2" />
					Summary
				</CardTitle>
				{data && (
					<CardDescription className="text-xs">
						Updated {updated(data.generated_at)} · refreshes weekly
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-2 text-sm">
				{isPending ? (
					<div className="space-y-2">
						<p className="text-xs text-muted-foreground">Writing summary…</p>
						<div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
						<div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
						<div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
					</div>
				) : isError || !data ? (
					<p className="text-muted-foreground">
						Couldn't write a summary right now.
					</p>
				) : (
					lines.map((line) => {
						const label = line.match(LABEL)?.[1];
						return (
							<p key={line}>
								{label && <span className="font-semibold">{label}: </span>}
								{line.replace(LABEL, "")}
							</p>
						);
					})
				)}
			</CardContent>
		</Card>
	);
}
