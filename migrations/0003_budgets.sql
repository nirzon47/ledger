-- applies from `month` onward until a later row for the same category
CREATE TABLE budgets (
	month TEXT NOT NULL,
	category_id INTEGER NOT NULL REFERENCES categories (id),
	planned INTEGER NOT NULL CHECK (planned >= 0), -- paise
	PRIMARY KEY (month, category_id)
);
