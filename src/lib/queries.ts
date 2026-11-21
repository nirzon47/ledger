import {
	QueryClient,
	queryOptions,
	useSuspenseQuery,
} from "@tanstack/react-query";
import {
	type Account,
	type AiSummary,
	api,
	type Category,
	type Insights,
	type Recurring,
	type Suggestion,
	type Summary,
	type Transaction,
	type TrendRow,
} from "./api";
import { defaultMonth, monthsEnding, toMonth } from "./month";

export const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 60_000 } },
});

// summaries only change weekly on the server
const HOUR = 60 * 60_000;

export const queries = {
	accounts: queryOptions({
		queryKey: ["accounts"],
		queryFn: () => api<Account[]>("/accounts"),
	}),
	categories: queryOptions({
		queryKey: ["categories"],
		queryFn: () => api<Category[]>("/categories"),
	}),
	suggestions: queryOptions({
		queryKey: ["suggestions"],
		queryFn: () => api<Suggestion[]>("/suggestions"),
	}),
	recurring: queryOptions({
		queryKey: ["recurring"],
		queryFn: () => api<Recurring[]>("/recurring"),
	}),
	summary: (month: string) =>
		queryOptions({
			queryKey: ["summary", month],
			queryFn: () => api<Summary>(`/summary?month=${month}`),
		}),
	due: (month: string) =>
		queryOptions({
			queryKey: ["due", month],
			queryFn: () =>
				month >= toMonth(new Date())
					? api<Recurring[]>(`/recurring/due?month=${month}`)
					: Promise.resolve([]),
		}),
	insights: (month: string) =>
		queryOptions({
			queryKey: ["insights", month],
			queryFn: () => api<Insights>(`/insights?month=${month}`),
		}),
	transactions: (month: string) =>
		queryOptions({
			queryKey: ["transactions", month],
			queryFn: () => api<Transaction[]>(`/transactions?month=${month}`),
		}),
	trends: (from: string, to: string) =>
		queryOptions({
			queryKey: ["trends", from, to],
			queryFn: () => api<TrendRow[]>(`/trends?from=${from}&to=${to}`),
		}),
	aiMonth: (month: string) =>
		queryOptions({
			queryKey: ["ai", "month", month],
			queryFn: () => api<AiSummary | null>(`/ai/month?month=${month}`),
			staleTime: HOUR,
		}),
	aiTrends: (from: string, to: string) =>
		queryOptions({
			queryKey: ["ai", "trends", from, to],
			queryFn: () => api<AiSummary | null>(`/ai/trends?from=${from}&to=${to}`),
			staleTime: HOUR,
		}),
};

// cached data renders immediately; stale data refreshes in the background
export const instant = { revalidateIfStale: true } as const;

export function ensureMonth(month: string) {
	return Promise.all([
		queryClient.ensureQueryData({ ...queries.summary(month), ...instant }),
		queryClient.ensureQueryData({ ...queries.due(month), ...instant }),
		queryClient.ensureQueryData({ ...queries.insights(month), ...instant }),
	]);
}

export function prefetchMonth(month: string) {
	return Promise.all([
		queryClient.prefetchQuery(queries.summary(month)),
		queryClient.prefetchQuery(queries.due(month)),
		queryClient.prefetchQuery(queries.insights(month)),
	]);
}

export function preloadApp() {
	const month = defaultMonth();
	const months = monthsEnding(month, 12);
	return Promise.all([
		queryClient.prefetchQuery(queries.accounts),
		queryClient.prefetchQuery(queries.categories),
		queryClient.prefetchQuery(queries.suggestions),
		queryClient.prefetchQuery(queries.recurring),
		queryClient.prefetchQuery(queries.transactions(month)),
		queryClient.prefetchQuery(queries.trends(months[0], month)),
		queryClient.prefetchQuery(queries.aiTrends(months[0], month)),
		queryClient.prefetchQuery(queries.aiMonth(month)),
		prefetchMonth(month),
	]);
}

export function useLists() {
	return {
		accounts: useSuspenseQuery(queries.accounts).data,
		categories: useSuspenseQuery(queries.categories).data,
		suggestions: useSuspenseQuery(queries.suggestions).data,
	};
}
