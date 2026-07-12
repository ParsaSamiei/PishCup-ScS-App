const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'scores.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  league TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS score_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  league TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  values_json TEXT NOT NULL,
  performance_total REAL NOT NULL,
  technical_total REAL NOT NULL,
  negative_total REAL NOT NULL,
  group_total REAL NOT NULL,
  final_total REAL NOT NULL,
  judge_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);
`);

module.exports = db;
