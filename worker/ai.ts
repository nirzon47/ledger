import type { Context } from "hono";
import type { AiSummary } from "./types";

const MODEL = "z-ai/glm-5.3-flash";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const SYSTEM = `You analyse one person's spending for their private budgeting app.
Reply with exactly these four lines, each starting with its label:
Overview: how the month or period is going, quoting the key numbers.
Unnecessary: specific spends that look avoidable or excessive, such as frequent small orders, overlapping subscriptions or impulse buys. Never call savings, investments, EMIs, rent, bills or medical costs unnecessary. If nothing stands out, say so.
Projection: where things are heading, using only the projection figures given.
Ideas: one or two specific, practical suggestions, such as a budget to set, a subscription to review or a habit to change.
Each line is one or two short sentences. Plain text only: no markdown, bullets or greetings.
Use ₹ with Indian digit grouping. Use only the data given and do no arithmetic of your own beyond simple comparisons.
Card spends count toward the month their bill is paid.`;

// written once, then rewritten only when over a week old and the data changed
export async function cachedSummary(
	env: Env,
	scope: "month" | "trends",
	key: string,
	print: string,
	facts: () => Promise<string>,
) {
	const cached = await env.DB.prepare(
		"SELECT content, generated_at, fingerprint FROM summaries WHERE scope = ? AND key = ?",
	)
		.bind(scope, key)
		.first<AiSummary & { fingerprint: string }>();
	if (cached) {
		const age =
			Date.now() - Date.parse(`${cached.generated_at.replace(" ", "T")}Z`);
		if (age < WEEK_MS || cached.fingerprint === print) {
			return { content: cached.content, generated_at: cached.generated_at };
		}
	}

	const content = await complete(env, await facts());
	return env.DB.prepare(
		`INSERT INTO summaries (scope, key, content, fingerprint) VALUES (?, ?, ?, ?)
		ON CONFLICT (scope, key) DO UPDATE
			SET content = excluded.content, fingerprint = excluded.fingerprint,
				generated_at = datetime('now')
		RETURNING content, generated_at`,
	)
		.bind(scope, key, content, print)
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
