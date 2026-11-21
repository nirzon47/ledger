CREATE TABLE goals (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	amount INTEGER NOT NULL CHECK (amount > 0), -- paise
	target_month TEXT NOT NULL, -- YYYY-MM
	done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
);
