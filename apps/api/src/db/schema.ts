/** SQLite schema. Idempotent — safe to run on every boot. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS repos (
  id             TEXT PRIMARY KEY,
  url            TEXT NOT NULL,
  name           TEXT NOT NULL,
  owner          TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  status         TEXT NOT NULL DEFAULT 'queued',
  error          TEXT,
  summary_json   TEXT,
  stats_json     TEXT,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id        TEXT PRIMARY KEY,
  repo_id   TEXT NOT NULL,
  path      TEXT NOT NULL,
  language  TEXT NOT NULL DEFAULT 'Other',
  size      INTEGER NOT NULL DEFAULT 0,
  summary   TEXT
);
CREATE INDEX IF NOT EXISTS idx_files_repo ON files(repo_id);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id        TEXT PRIMARY KEY,
  repo_id   TEXT NOT NULL,
  label     TEXT NOT NULL,
  kind      TEXT NOT NULL DEFAULT 'module',
  meta_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_nodes_repo ON graph_nodes(repo_id);

CREATE TABLE IF NOT EXISTS graph_edges (
  id       TEXT PRIMARY KEY,
  repo_id  TEXT NOT NULL,
  source   TEXT NOT NULL,
  target   TEXT NOT NULL,
  weight   INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_edges_repo ON graph_edges(repo_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           TEXT PRIMARY KEY,
  repo_id      TEXT NOT NULL,
  role         TEXT NOT NULL,
  content      TEXT NOT NULL,
  sources_json TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_repo ON chat_messages(repo_id);

CREATE TABLE IF NOT EXISTS issues (
  id               TEXT PRIMARY KEY,
  repo_id          TEXT NOT NULL,
  number           INTEGER NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT,
  url              TEXT,
  labels_json      TEXT,
  comments         INTEGER DEFAULT 0,
  created_at       TEXT,
  difficulty       TEXT,
  difficulty_score INTEGER,
  est_minutes      INTEGER,
  files_json       TEXT,
  reason           TEXT,
  heuristic_json   TEXT
);
CREATE INDEX IF NOT EXISTS idx_issues_repo ON issues(repo_id);

CREATE TABLE IF NOT EXISTS fix_sessions (
  id            TEXT PRIMARY KEY,
  repo_id       TEXT NOT NULL,
  issue_number  INTEGER,
  issue_title   TEXT NOT NULL,
  issue_body    TEXT,
  status        TEXT NOT NULL DEFAULT 'understanding',
  branch        TEXT NOT NULL,
  plan_json     TEXT,
  understand    TEXT,
  test_output   TEXT,
  test_passed   INTEGER,
  patch         TEXT,
  pr_json       TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_repo ON fix_sessions(repo_id);

CREATE TABLE IF NOT EXISTS file_changes (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  path       TEXT NOT NULL,
  diff       TEXT NOT NULL,
  decision   TEXT NOT NULL DEFAULT 'pending',
  additions  INTEGER DEFAULT 0,
  deletions  INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_changes_session ON file_changes(session_id);
`;
