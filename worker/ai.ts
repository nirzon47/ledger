import type { Context } from "hono";
import type { AiSummary, Category, Insights, Summary, TrendRow } from "./types";

const MODEL = "z-ai/glm-5.3-flash";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const SYSTEM = `You summarise one person's expenses for their private budgeting app.
Write 2-4 short plain sentences. No markdown, no lists, no greetings.
Use ₹ with Indian digit grouping. Quote the most notable numbers and end with one concrete, specific way to spend less.
Card spends count toward the month the bill is paid. "Savings / Investments" is money saved, never something to cut.
Only use the data given.`;

const rupees = (paise: number) =>
	`₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export async function cachedSummary(
	env: Env,
	scope: "month" | "trends",
	key: string,
	facts: () => Promise<string>,
) {
	const cached = await env.DB.prepare(
		"SELECT content, generated_at FROM summaries WHERE scope = ? AND key = ?",
	)
		.bind(scope, key)
		.first<AiSummary>();
	const age = cached
		? Date.now() - Date.parse(`${cached.generated_at.replace(" ", "T")}Z`)
		: Number.POSITIVE_INFINITY;
	if (cached && age < WEEK_MS) return cached;

	const content = await complete(env, await facts());
	return env.DB.prepare(
		`INSERT INTO summaries (scope, key, content) VALUES (?, ?, ?)
		ON CONFLICT (scope, key) DO UPDATE
			SET content = excluded.content, generated_at = datetime('now')
		RETURNING content, generated_at`,
	)
		.bind(scope, key, content)
		.first<AiSummary>();
}

async function complete(env: Env, facts: string) {
	const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			model: MODEL,
			reasoning: { effort: "low" },
			provider: { data_collection: "deny" },
			max_tokens: 2000,
			messages: [
				{ role: "system", content: SYSTEM },
				{ role: "user", content: facts },
			],
		}),
	});
	if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
	const data = await res.json<{
		choices?: { message?: { content?: string } }[];
	}>();
	const content = data.choices?.[0]?.message?.content?.trim();
	if (!content) throw new Error("OpenRouter returned no text");
	return content;
}

export async function aiResponse(
	c: Context<{ Bindings: Env }>,
	load: () => Promise<AiSummary | null>,
) {
	try {
		return c.json(await load());
	} catch (err) {
		console.error(err);
		return c.json({ error: "Couldn't write a summary right now" }, 502);
	}
}

export function monthFacts(month: string, s: Summary, i: Insights) {
	const spent = s.categories.filter((c) => c.type === "expense" && c.actual);
	return [
		`Month: ${month}`,
		`Income ${rupees(s.income)} (planned ${rupees(s.planned_income)}), expenses ${rupees(s.expenses)} (planned ${rupees(s.planned_expenses)}), left ${rupees(s.income - s.expenses)}.`,
		`Expenses by category: ${spent.map((c) => `${c.name} ${rupees(c.actual)}${c.planned ? ` of ${rupees(c.planned)} planned` : ""}`).join("; ")}.`,
		i.above_usual.length
			? `Above the 3-month usual: ${i.above_usual.map((c) => `${c.name} ${rupees(c.actual)} vs usual ${rupees(c.usual)}`).join("; ")}.`
			: "Nothing is above the 3-month usual.",
		`Top spends: ${i.top_descriptions.map((d) => `${d.description} ${d.times}x ${rupees(d.total)}`).join("; ")}.`,
		`Paid with: ${s.accounts.map((a) => `${a.name} ${rupees(a.actual)}`).join("; ")}.`,
		`Recurring expenses per month: ${i.recurring.map((r) => `${r.description} ${rupees(r.amount)}`).join("; ") || "none"}.`,
	].join("\n");
}

export function trendsFacts(
	from: string,
	to: string,
	rows: TrendRow[],
	categories: Category[],
) {
	const months = [...new Set(rows.map((r) => r.month))].sort();
	const sum = (filter: (r: TrendRow) => boolean) =>
		rows.filter(filter).reduce((total, r) => total + r.total, 0);
	const byCategory = categories
		.filter((c) => c.type === "expense")
		.map((c) => ({ name: c.name, total: sum((r) => r.category_id === c.id) }))
		.filter((c) => c.total > 0)
		.sort((a, b) => b.total - a.total);
	return [
		`Period: ${from} to ${to}`,
		...months.map((m) => {
			const income = sum((r) => r.month === m && r.type === "income");
			const spent = sum((r) => r.month === m && r.type === "expense");
			return `${m}: income ${rupees(income)}, spent ${rupees(spent)}, left ${rupees(income - spent)}`;
		}),
		`Spend by category over the period: ${byCategory.map((c) => `${c.name} ${rupees(c.total)}`).join("; ")}.`,
	].join("\n");
}
