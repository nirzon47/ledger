import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import readXlsxFile from "read-excel-file/node";

type Grid = unknown[][];
type Type = "expense" | "income";
type Row = {
	type: Type;
	month: string;
	date: string;
	amount: number;
	description: string;
	category: string;
	account: string | null;
};

const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
const OUT = "imports/sheets.sql";
const problems: string[] = [];

// Transactions tab: header on row 3, expenses block then income block, each starting at "Date"
function blocksOf(header: unknown[], file: string) {
	const names = header.map((h) => text(h).toLowerCase());
	const starts = names.flatMap((n, i) => (n === "date" ? [i] : []));
	if (starts.length !== 2)
		throw new Error(`${file}: expected two Date columns`);
	return (["expense", "income"] as const).map((type, b) => {
		const end = b === 0 ? starts[1] : names.length;
		const column = (name: string) => {
			const i = names.indexOf(name, starts[b]);
			return i >= 0 && i < end ? i : -1;
		};
		const cols = {
			type,
			date: starts[b],
			amount: column("amount"),
			description: column("description"),
			account: column("from"),
			category: column("category"),
		};
		if (cols.amount < 0 || cols.category < 0) {
			throw new Error(`${file}: ${type} block is missing Amount or Category`);
		}
		return cols;
	});
}

const dir = process.argv[2];
if (!dir) throw new Error("Usage: bun scripts/import-sheets.ts <folder>");

const text = (v: unknown) => (v == null ? "" : String(v).trim());
const quote = (v: string | number | null) =>
	v === null
		? "NULL"
		: typeof v === "number"
			? String(v)
			: `'${v.replaceAll("'", "''")}'`;
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

function monthOf(file: string) {
	const match = file.match(/^([a-z]+)\s+(\d{4})/i);
	const index = match ? MONTHS.indexOf(match[1].slice(0, 3).toLowerCase()) : -1;
	if (!match || index < 0) throw new Error(`No month in "${file}"`);
	return `${match[2]}-${String(index + 1).padStart(2, "0")}`;
}

function readRows(grid: Grid, file: string, month: string) {
	const rows: Row[] = [];
	const warnings: string[] = [];
	const blocks = blocksOf(grid[2] ?? [], file);
	grid.slice(3).forEach((cells, i) => {
		for (const b of blocks) {
			const amount = cells[b.amount];
			if (amount == null || amount === "") continue;
			const where = `${file} row ${i + 4} ${b.type}`;
			if (amount === 0) {
				warnings.push(`${where}: skipped ₹0 "${text(cells[b.description])}"`);
				continue;
			}
			const cell = cells[b.date];
			const category = text(cells[b.category]);
			if (typeof amount !== "number" || !category) {
				problems.push(`${where}: amount ${amount}, category "${category}"`);
				continue;
			}
			let date = `${month}-05`;
			if (cell instanceof Date) {
				date = cell.toISOString().slice(0, 10);
			} else if (cell == null || cell === "") {
				warnings.push(`${where}: no date, used ${date}`);
			} else {
				problems.push(`${where}: date is ${JSON.stringify(cell)}`);
				continue;
			}
			let description = b.description < 0 ? "" : text(cells[b.description]);
			if (!description) {
				description = category;
				warnings.push(`${where}: no description, used "${category}"`);
			}
			rows.push({
				type: b.type,
				month,
				date,
				amount: Math.round(amount * 100),
				description,
				category,
				account: b.account < 0 ? null : text(cells[b.account]) || null,
			});
		}
	});
	return { rows, warnings };
}

const files = readdirSync(dir).filter((f) => /budget\.xlsx$/i.test(f));
const all: Row[] = [];
const report: string[] = [];
let mismatches = 0;

for (const file of files.sort((a, b) => monthOf(a).localeCompare(monthOf(b)))) {
	const month = monthOf(file);
	const sheets = (await readXlsxFile(path.join(dir, file))) as unknown as {
		sheet: string;
		data: Grid;
	}[];
	const tab = (name: string) => {
		const found = sheets.find((s) => s.sheet === name);
		if (!found) throw new Error(`${file}: no ${name} tab`);
		return found.data;
	};
	const { rows, warnings } = readRows(tab("Transactions"), file, month);
	const summary = tab("Summary");
	all.push(...rows);

	const line = [`${month}  ${file}`];
	for (const [type, col] of [
		["expense", 2],
		["income", 8],
	] as const) {
		const mine = rows.filter((r) => r.type === type);
		const total = mine.reduce((sum, r) => sum + r.amount, 0);
		const expected = Math.round(Number(summary[15][col] ?? 0) * 100);
		const ok = total === expected;
		if (!ok) mismatches++;
		line.push(
			`  ${type}: ${mine.length} rows, ${rupees(total)} ${ok ? "✓" : `✗ Summary says ${rupees(expected)}`}`,
		);
	}
	const planned = Number(summary[14][2] ?? 0) + Number(summary[14][8] ?? 0);
	const start = Number(summary[1][11] ?? 0);
	if (planned)
		line.push(`  note: planned amounts set (${rupees(planned * 100)})`);
	if (start) line.push(`  note: starting balance ${rupees(start * 100)}`);
	report.push(...line, ...warnings.map((w) => `  warning: ${w}`));
}

const months = [...new Set(all.map((r) => r.month))];
const accounts = [
	...new Set(all.flatMap((r) => (r.account ? [r.account] : []))),
];
const categories = [...new Set(all.map((r) => `${r.type}|${r.category}`))];

const statements = [
	`DELETE FROM transactions WHERE budget_month IN (${months.map(quote).join(", ")});`,
	...accounts.map((name) => {
		const card = /\bcc$/i.test(name);
		return `INSERT OR IGNORE INTO accounts (name, kind, cycle_start_day) VALUES (${quote(name)}, ${quote(card ? "card" : "bank")}, ${card ? 1 : "NULL"});`;
	}),
	...categories.map((key) => {
		const [type, name] = key.split("|");
		return `INSERT OR IGNORE INTO categories (name, type) VALUES (${quote(name)}, ${quote(type)});`;
	}),
	...all.map(
		(r) =>
			`INSERT INTO transactions (type, date, budget_month, amount, description, category_id, account_id) VALUES (${quote(r.type)}, ${quote(r.date)}, ${quote(r.month)}, ${r.amount}, ${quote(r.description)}, (SELECT id FROM categories WHERE name = ${quote(r.category)} AND type = ${quote(r.type)}), ${r.account ? `(SELECT id FROM accounts WHERE name = ${quote(r.account)})` : "NULL"});`,
	),
];

if (problems.length) {
	console.log(report.join("\n"));
	console.log(`\nNot written. Fix these rows first:\n${problems.join("\n")}`);
	process.exit(1);
}

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, `${statements.join("\n")}\n`);

console.log(report.join("\n"));
console.log(
	`\n${all.length} transactions across ${months.length} months, ${accounts.length} accounts, ${categories.length} categories`,
);
console.log(
	mismatches
		? `${mismatches} total(s) differ from the Summary tabs; check before importing.`
		: "All totals match the Summary tabs.",
);
console.log(`Wrote ${OUT}`);
