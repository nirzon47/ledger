-- one row per update; the latest row per kind is the current balance
CREATE TABLE balances (
	id INTEGER PRIMARY KEY,
	kind TEXT NOT NULL CHECK (kind IN ('mf', 'liquid')),
	amount INTEGER NOT NULL CHECK (amount >= 0), -- paise, principal only
	recorded_on TEXT NOT NULL -- YYYY-MM-DD
);

CREATE INDEX balances_kind_date ON balances (kind, recorded_on);
