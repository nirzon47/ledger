ALTER TABLE transactions
	ADD COLUMN recurring_id INTEGER REFERENCES recurring (id) ON DELETE SET NULL;

CREATE INDEX transactions_recurring ON transactions (recurring_id, budget_month);
