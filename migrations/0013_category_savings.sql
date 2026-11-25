-- money set aside rather than spent; feeds the roadmap's "saved" and the corpus
ALTER TABLE categories
	ADD COLUMN savings INTEGER NOT NULL DEFAULT 0 CHECK (savings IN (0, 1));

UPDATE categories SET savings = 1, fixed = 1
WHERE type = 'expense' AND name IN ('Savings / Investments', 'Wealth');
