CREATE TABLE accounts (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	kind TEXT NOT NULL CHECK (kind IN ('bank', 'card')),
	-- cards only: spends from this day of the month count toward next month
	cycle_start_day INTEGER CHECK (cycle_start_day BETWEEN 1 AND 31),
	CHECK ((kind = 'card') = (cycle_start_day IS NOT NULL))
);

CREATE TABLE categories (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
	UNIQUE (name, type)
);

CREATE TABLE transactions (
	id INTEGER PRIMARY KEY,
	type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
	date TEXT NOT NULL,
	budget_month TEXT NOT NULL, -- YYYY-MM
	amount INTEGER NOT NULL CHECK (amount > 0), -- paise
	description TEXT NOT NULL,
	category_id INTEGER NOT NULL REFERENCES categories (id),
	account_id INTEGER REFERENCES accounts (id)
);

CREATE INDEX transactions_budget_month ON transactions (budget_month);
