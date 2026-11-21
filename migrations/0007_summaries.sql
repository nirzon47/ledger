CREATE TABLE summaries (
	scope TEXT NOT NULL CHECK (scope IN ('month', 'trends')),
	key TEXT NOT NULL,
	content TEXT NOT NULL,
	generated_at TEXT NOT NULL DEFAULT (datetime('now')), -- UTC
	PRIMARY KEY (scope, key)
);
