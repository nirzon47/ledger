-- fixed = commitments that can't easily be cut; everything else is flexible
ALTER TABLE categories
	ADD COLUMN fixed INTEGER NOT NULL DEFAULT 0 CHECK (fixed IN (0, 1));

UPDATE categories SET fixed = 1
WHERE type = 'expense'
	AND name IN ('Savings / Investments', 'Hardware', 'Subscriptions', 'Utilities', 'Debt');
