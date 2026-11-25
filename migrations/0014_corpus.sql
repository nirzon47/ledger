-- manual corpus changes; 'set' records the actual total, 'adjust' adds (or withdraws when negative)
CREATE TABLE corpus_entries (
	id INTEGER PRIMARY KEY,
	kind TEXT NOT NULL CHECK (kind IN ('set', 'adjust')),
	amount INTEGER NOT NULL, -- paise
	date TEXT NOT NULL, -- YYYY-MM-DD
	note TEXT NOT NULL DEFAULT ''
);

-- the latest MF + liquid figures become the starting total
INSERT INTO corpus_entries (kind, amount, date, note)
SELECT 'set', SUM(amount), MAX(recorded_on), 'Starting corpus (MF + liquid)'
FROM balances
WHERE id IN (SELECT MAX(id) FROM balances GROUP BY kind)
HAVING COUNT(*) > 0;

ALTER TABLE goals ADD COLUMN done_on TEXT; -- YYYY-MM-DD it was marked done
