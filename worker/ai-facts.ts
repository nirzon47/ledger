import { getInsights, getSummary, getTrendRows } from "./data";
import { shiftMonth } from "./month";
import type { Category } from "./types";

const rupees = (paise: number) =>
	`₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

const key = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

// the Worker runs in UTC; budgeting happens in IST
function today() {
	const ist = new Date(Date.now() + 330 * 60_000);
	const month = key(ist.getUTCFullYear(), ist.getUTCMonth() + 1);
	const [y, m] = month.split("-").map(Number);
	const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
	return { month, day: ist.getUTCDate(), days };
}

const usualIncomeSql = `SELECT COALESCE(SUM(amount), 0) * 1.0 /
		MAX(COUNT(DISTINCT budget_month), 1) AS usual
	FROM transactions
	WHERE type = 'income' AND budget_month IN (
		SELECT DISTINCT budget_month FROM transactions
		WHERE budget_month < ? ORDER BY budget_month DESC LIMIT 3
	)`;

export async function monthFacts(db: D1Database, month: string) {
	const [s, insights, spends, split, pending, usualIncome] = await Promise.all([
		getSummary(db, month),
		getInsights(db, month),
		db
			.prepare(
				`SELECT MIN(t.description) AS description, c.name AS category,
					COUNT(*) AS times, SUM(t.amount) AS total
				FROM transactions t JOIN categories c ON c.id = t.category_id
				WHERE t.budget_month = ? AND t.type = 'expense'
				GROUP BY lower(trim(t.description)), t.category_id
				ORDER BY total DESC`,
			)
			.bind(month)
			.all<{
				description: string;
				category: string;
				times: number;
				total: number;
			}>(),
		db
			.prepare(
				`SELECT
					COALESCE(SUM(CASE WHEN a.kind = 'card' THEN t.amount END), 0) AS card,
					COALESCE(SUM(CASE WHEN a.kind = 'card' THEN 0 ELSE t.amount END), 0) AS other
				FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id
				WHERE t.budget_month = ? AND t.type = 'expense'`,
			)
			.bind(month)
			.first<{ card: number; other: number }>(),
		db
			.prepare(
				`SELECT r.description, r.amount FROM recurring r
				WHERE r.type = 'expense' AND NOT EXISTS (
					SELECT 1 FROM transactions t
					WHERE t.recurring_id = r.id AND t.budget_month = ?
				)`,
			)
			.bind(month)
			.all<{ description: string; amount: number }>(),
		db.prepare(usualIncomeSql).bind(month).first<{ usual: number }>(),
	]);

	const t = today();
	const cycle = shiftMonth(month, -1);
	const progress = t.month > cycle ? 1 : t.month < cycle ? 0 : t.day / t.days;
	const card = split?.card ?? 0;
	const other = split?.other ?? 0;
	const due = pending.results.reduce((sum, r) => sum + r.amount, 0);
	const projectedCard = progress > 0 ? card / progress : card;
	const projected = other + projectedCard + due;
	const income = s.income || (usualIncome?.usual ?? 0);
	const dueList = pending.results.length
		? ` (${pending.results.map((r) => `${r.description} ${rupees(r.amount)}`).join(", ")})`
		: "";

	return [
		`Month: ${month}. Today: ${t.month}-${String(t.day).padStart(2, "0")}.`,
		`Income logged ${rupees(s.income)} (planned ${rupees(s.planned_income)}, usual ${rupees(usualIncome?.usual ?? 0)}). Expenses ${rupees(s.expenses)} (planned ${rupees(s.planned_expenses)}). Left ${rupees(s.income - s.expenses)}.`,
		`Expenses by category: ${s.categories
			.filter((c) => c.type === "expense" && c.actual)
			.map(
				(c) =>
					`${c.name} ${rupees(c.actual)}${c.planned ? ` of ${rupees(c.planned)} planned` : ""}`,
			)
			.join("; ")}.`,
		insights.above_usual.length
			? `Above the 3-month usual: ${insights.above_usual.map((c) => `${c.name} ${rupees(c.actual)} vs ${rupees(c.usual)}`).join("; ")}.`
			: "No category is above its 3-month usual.",
		`Every spend, grouped by description: ${spends.results.map((d) => `${d.description} (${d.category}) ${d.times}x ${rupees(d.total)}`).join("; ")}.`,
		`Paid with: ${s.accounts.map((a) => `${a.name} ${rupees(a.actual)}`).join("; ")}.`,
		`Recurring expenses each month: ${insights.recurring.map((r) => `${r.description} ${rupees(r.amount)}`).join("; ") || "none"}.`,
		month < t.month
			? `Projection: this month is over and the figures above are final. Usual monthly income is ${rupees(usualIncome?.usual ?? 0)}.`
			: progress >= 1
				? `Projection: card spends for this month are complete. Recurring not yet added ${rupees(due)}${dueList}. Projected total ${rupees(projected)}, leaving ${rupees(income - projected)}.`
				: `Projection: card spends so far ${rupees(card)} with ${Math.round(progress * 100)}% of the card cycle (${cycle}) gone, so about ${rupees(projectedCard)} at this pace. Other spends so far ${rupees(other)}. Recurring not yet added ${rupees(due)}${dueList}. Projected total ${rupees(projected)}, leaving about ${rupees(income - projected)}${s.income ? "" : " if income matches the usual"}.`,
	].join("\n");
}

export async function trendsFacts(db: D1Database, from: string, to: string) {
	const [rows, categories] = await Promise.all([
		getTrendRows(db, from, to),
		db.prepare("SELECT id, name, type, fixed FROM categories").all<Category>(),
	]);
	const open = shiftMonth(today().month, 1);
	const sum = (match: (r: (typeof rows)[number]) => boolean) =>
		rows.filter(match).reduce((total, r) => total + r.total, 0);
	const months = [...new Set(rows.map((r) => r.month))].sort();
	const totals = months.map((m) => ({
		month: m,
		income: sum((r) => r.month === m && r.type === "income"),
		spent: sum((r) => r.month === m && r.type === "expense"),
	}));
	const complete = totals.filter((t) => t.month < open);
	const recent = complete.slice(-3);
	const earlier = complete.slice(-6, -3);
	const avg = (list: typeof totals, k: "income" | "spent") =>
		list.length ? list.reduce((s, t) => s + t[k], 0) / list.length : 0;
	const avgCategory = (list: typeof totals, id: number) =>
		list.length
			? sum(
					(r) => r.category_id === id && list.some((t) => t.month === r.month),
				) / list.length
			: 0;

	const expense = categories.results.filter((c) => c.type === "expense");
	const rising = expense
		.map((c) => ({
			name: c.name,
			now: avgCategory(recent, c.id),
			before: avgCategory(earlier, c.id),
		}))
		.filter((c) => earlier.length && c.now > c.before)
		.sort((a, b) => b.now - b.before - (a.now - a.before))
		.slice(0, 3);
	const spentAvg = avg(recent, "spent");
	const leftAvg = avg(recent, "income") - spentAvg;
	const inProgress = totals.find((t) => t.month >= open);

	return [
		`Period: ${from} to ${to}.`,
		...totals.map(
			(t) =>
				`${t.month}: income ${rupees(t.income)}, spent ${rupees(t.spent)}, left ${rupees(t.income - t.spent)}${t.month >= open ? " (in progress)" : ""}`,
		),
		`Monthly average over the last ${recent.length} complete months: income ${rupees(avg(recent, "income"))}, spent ${rupees(spentAvg)}, left ${rupees(leftAvg)}. Projection at that pace for a year: spent ${rupees(spentAvg * 12)}, left ${rupees(leftAvg * 12)}.`,
		rising.length
			? `Rising categories (monthly average, last 3 complete months vs the 3 before): ${rising.map((c) => `${c.name} ${rupees(c.now)} vs ${rupees(c.before)}`).join("; ")}.`
			: "No category is rising compared with the 3 months before.",
		`Spend by category over the period: ${expense
			.map((c) => ({ name: c.name, total: sum((r) => r.category_id === c.id) }))
			.filter((c) => c.total > 0)
			.sort((a, b) => b.total - a.total)
			.map((c) => `${c.name} ${rupees(c.total)}`)
			.join("; ")}.`,
		inProgress
			? `${inProgress.month} is still in progress, so leave it out of comparisons.`
			: "",
	]
		.filter(Boolean)
		.join("\n");
}
