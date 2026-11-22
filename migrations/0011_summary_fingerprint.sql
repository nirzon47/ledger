-- a summary older than a week is only rewritten when this changes
ALTER TABLE summaries ADD COLUMN fingerprint TEXT NOT NULL DEFAULT '';
