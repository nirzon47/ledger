-- monthly roadmap targets; amounts in paise
CREATE TABLE plan (
	month TEXT PRIMARY KEY, -- YYYY-MM
	savings INTEGER NOT NULL DEFAULT 0, -- planned salary savings
	capex INTEGER NOT NULL DEFAULT 0,
	loan INTEGER NOT NULL DEFAULT 0, -- EMI or foreclosure outflow
	corpus INTEGER, -- planned ending usable corpus
	note TEXT NOT NULL DEFAULT ''
);
