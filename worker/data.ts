import { shiftMonth } from "./month";
import type {
	AccountSpend,
	Category,
	CategoryTotal,
	DayTotal,
	Insights,
	Pace,
	Summary,
	TrendRow,
} from "./types";

export async function getSummary(db: D1Database, month: string) {
	const [totals, accounts] = await Promise.all([
		db
			.prepare(
				`SELECT c.id, c.name, c.type,
					COALESCE((
						SELECT b.planned FROM budgets b
						WHERE b.category_id = c.id AND b.month <= ?1
						ORDER BY b.month DESC LIMIT 1
					), 0) AS planned,
					COALESCE((
						SELECT SUM(t.amount) FROM transactions t
						WHERE t.category_id = c.id AND t.budget_month = ?1
					), 0) AS actual
				FROM categories c
				ORDER BY c.id`,
			)
			.bind(month)
			.all<CategoryTotal>(),
		db
			.prepare(
				`SELECT a.id, COALESCE(a.name, 'No account') AS name,
					SUM(t.amount) AS actual
				FROM transactions t
				LEFT JOIN accounts a ON a.id = t.account_id
				WHERE t.budget_month = ? AND t.type = 'expense'
				GROUP BY t.account_id
				ORDER BY actual DESC`,
			)
			.bind(month)
			.all<AccountSpend>(),
	]);
	const total = (type: Category["type"], key: "planned" | "actual") =>
		totals.results
			.filter((r) => r.type === type)
			.reduce((sum, r) => sum + r[key], 0);
	return {
		income: total("income", "actual"),
		expenses: total("expense", "actual"),
		planned_income: total("income", "planned"),
		planned_expenses: total("expense", "planned"),
		categories: totals.results,
		accounts: accounts.results,
	} satisfies Summary;
}

// daily expense totals for a budget month, counting only spends dated in its card cycle
export async function getPace(db: D1Database, month: string) {
	const days = (budget: string) =>
		db
			.prepare(
				`SELECT CAST(substr(date, 9, 2) AS INTEGER) AS day, SUM(amount) AS total
				FROM transactions
				WHERE budget_month = ? AND type = 'expense' AND substr(date, 1, 7) = ?
				GROUP BY day ORDER BY day`,
			)
			.bind(budget, shiftMonth(budget, -1))
			.all<DayTotal>();
	const [current, previous] = await Promise.all([
		days(month),
		days(shiftMonth(month, -1)),
	]);
	return {
		current: current.results,
		previous: previous.results,
	} satisfies Pace;
}

// cheap signature of the transactions in a range; changes when entries are added, removed or edited
export async function fingerprint(db: D1Database, from: string, to: string) {
	const row = await db
		.prepare(
			`SELECT COUNT(*) AS count,
				COUNT(*) || ':' || COALESCE(SUM(amount), 0) || ':' || COALESCE(SUM(id), 0)
				|| ':' || COALESCE(SUM(category_id * 31 + COALESCE(account_id, 0)), 0)
				|| ':' || COALESCE(SUM(length(description) + unicode(description)), 0)
				AS print
			FROM transactions WHERE budget_month BETWEEN ? AND ?`,
		)
		.bind(from, to)
		.first<{ count: number; print: string }>();
	return row ?? { count: 0, print: "" };
}

export async function getTrendRows(db: D1Database, from: string, to: string) {
	const { results } = await db
		.prepare(
			`SELECT budget_month AS month, category_id, type, SUM(amount) AS total
			FROM transactions
			WHERE budget_month BETWEEN ? AND ?
			GROUP BY budget_month, category_id, type`,
		)
		.bind(from, to)
		.all<TrendRow>();
	return results;
}

export async function getInsights(db: D1Database, month: string) {
	const [history, usual, top, recurring] = await Promise.all([
		db
			.prepare(
				`SELECT COUNT(*) AS n FROM (
					SELECT DISTINCT budget_month FROM transactions
					WHERE budget_month < ? ORDER BY budget_month DESC LIMIT 3
				)`,
			)
			.bind(month)
			.first<{ n: number }>(),
		db
			.prepare(
				`WITH prev AS (
					SELECT DISTINCT budget_month FROM transactions
					WHERE budget_month < ?1 ORDER BY budget_month DESC LIMIT 3
				)
				SELECT id, name, actual, usual FROM (
					SELECT c.id, c.name,
						COALESCE((
							SELECT SUM(t.amount) FROM transactions t
							WHERE t.category_id = c.id AND t.budget_month = ?1
						), 0) AS actual,
						ROUND(COALESCE((
							SELECT SUM(t.amount) FROM transactions t
							WHERE t.category_id = c.id
								AND t.budget_month IN (SELECT budget_month FROM prev)
						), 0) * 1.0 / MAX((SELECT COUNT(*) FROM prev), 1)) AS usual
					FROM categories c WHERE c.type = 'expense'
				)
				WHERE actual > usual
				ORDER BY actual - usual DESC
				LIMIT 3`,
			)
			.bind(month)
			.all<Insights["above_usual"][number]>(),
		db
			.prepare(
				`SELECT MIN(description) AS description, COUNT(*) AS times,
					SUM(amount) AS total
				FROM transactions
				WHERE budget_month = ? AND type = 'expense'
				GROUP BY lower(trim(description))
				ORDER BY total DESC
				LIMIT 5`,
			)
			.bind(month)
			.all<Insights["top_descriptions"][number]>(),
		db
			.prepare(
				`SELECT id, description, amount FROM recurring
				WHERE type = 'expense' ORDER BY amount DESC`,
			)
			.all<Insights["recurring"][number]>(),
	]);
	return {
		history_months: history?.n ?? 0,
		above_usual: history?.n ? usual.results : [],
		top_descriptions: top.results,
		recurring: recurring.results,
	} satisfies Insights;
}
