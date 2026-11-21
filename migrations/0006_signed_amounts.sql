-- SQLite can't alter a CHECK, so rebuild the table to allow negative corrections
CREATE TABLE transactions_new (
	id INTEGER PRIMARY KEY,
	type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
	date TEXT NOT NULL,
	budget_month TEXT NOT NULL, -- YYYY-MM
	amount INTEGER NOT NULL CHECK (amount <> 0), -- paise; negative = correction or refund
	description TEXT NOT NULL,
	category_id INTEGER NOT NULL REFERENCES categories (id),
	account_id INTEGER REFERENCES accounts (id),
	recurring_id INTEGER REFERENCES recurring (id) ON DELETE SET NULL
);

INSERT INTO transactions_new
SELECT id, type, date, budget_month, amount, description, category_id, account_id, recurring_id
FROM transactions;

DROP TABLE transactions;

ALTER TABLE transactions_new RENAME TO transactions;

CREATE INDEX transactions_budget_month ON transactions (budget_month);

CREATE INDEX transactions_recurring ON transactions (recurring_id, budget_month);
