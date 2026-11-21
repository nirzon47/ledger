CREATE TABLE recurring (
	id INTEGER PRIMARY KEY,
	type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
	description TEXT NOT NULL,
	amount INTEGER NOT NULL CHECK (amount > 0), -- paise
	day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
	category_id INTEGER NOT NULL REFERENCES categories (id),
	account_id INTEGER REFERENCES accounts (id)
);
