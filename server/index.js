const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const db = require('./db');
const { LEAGUES, calculateTotals } = require('./scoringConfig');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Config ----------
app.get('/api/config', (req, res) => {
  res.json(LEAGUES);
});

// ---------- Teams ----------
app.get('/api/teams', (req, res) => {
  const { league } = req.query;
  const rows = league
    ? db.prepare('SELECT * FROM teams WHERE league = ? ORDER BY name').all(league)
    : db.prepare('SELECT * FROM teams ORDER BY league, name').all();
  res.json(rows);
});

app.post('/api/teams', (req, res) => {
  const { name, league } = req.body;
  if (!name || !LEAGUES[league]) {
    return res.status(400).json({ error: 'نام تیم یا رده لیگ نامعتبر است' });
  }
  const info = db.prepare('INSERT INTO teams (name, league) VALUES (?, ?)').run(name.trim(), league);
  res.json({ id: info.lastInsertRowid, name: name.trim(), league });
});

app.delete('/api/teams/:id', (req, res) => {
  db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Score entries ----------
app.get('/api/scores', (req, res) => {
  const { team_id, league } = req.query;
  let sql = `SELECT s.*, t.name as team_name FROM score_entries s JOIN teams t ON t.id = s.team_id WHERE 1=1`;
  const params = [];
  if (team_id) { sql += ' AND s.team_id = ?'; params.push(team_id); }
  if (league) { sql += ' AND s.league = ?'; params.push(league); }
  sql += ' ORDER BY s.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map((r) => ({ ...r, values_json: JSON.parse(r.values_json) })));
});

app.post('/api/scores', (req, res) => {
  const { team_id, league, round_number, values, judge_name } = req.body;
  if (!team_id || !LEAGUES[league] || !round_number) {
    return res.status(400).json({ error: 'ورودی نامعتبر است (تیم، لیگ یا شماره راند)' });
  }
  const totals = calculateTotals(league, values || {});
  const info = db.prepare(`
    INSERT INTO score_entries
      (team_id, league, round_number, values_json, performance_total, technical_total, negative_total, group_total, final_total, judge_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    team_id, league, round_number, JSON.stringify(values || {}),
    totals.performance.total, totals.technical.total, totals.negative.total, totals.group.total, totals.final_total,
    judge_name || null
  );
  res.json({ id: info.lastInsertRowid, ...totals });
});

app.put('/api/scores/:id', (req, res) => {
  const { values, round_number, judge_name } = req.body;
  const existing = db.prepare('SELECT * FROM score_entries WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'رکورد یافت نشد' });
  const totals = calculateTotals(existing.league, values || {});
  db.prepare(`
    UPDATE score_entries
    SET values_json=?, performance_total=?, technical_total=?, negative_total=?, group_total=?, final_total=?, round_number=?, judge_name=?
    WHERE id=?
  `).run(
    JSON.stringify(values || {}), totals.performance.total, totals.technical.total, totals.negative.total,
    totals.group.total, totals.final_total, round_number || existing.round_number, judge_name || existing.judge_name,
    req.params.id
  );
  res.json({ id: Number(req.params.id), ...totals });
});

app.delete('/api/scores/:id', (req, res) => {
  db.prepare('DELETE FROM score_entries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Leaderboard (best round per team) ----------
app.get('/api/leaderboard', (req, res) => {
  const { league } = req.query;
  let sql = `
    SELECT t.id as team_id, t.name as team_name, t.league,
           MAX(s.final_total) as best_score,
           COUNT(s.id) as rounds_played
    FROM teams t
    LEFT JOIN score_entries s ON s.team_id = t.id
  `;
  const params = [];
  if (league) { sql += ' WHERE t.league = ?'; params.push(league); }
  sql += ' GROUP BY t.id ORDER BY (best_score IS NULL), best_score DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// ---------- Export to Excel ----------
app.get('/api/export', (req, res) => {
  const { league } = req.query;
  let sql = `SELECT t.name as team_name, s.league, s.round_number,
                    s.performance_total, s.technical_total, s.negative_total, s.group_total, s.final_total,
                    s.judge_name, s.created_at
             FROM score_entries s JOIN teams t ON t.id = s.team_id`;
  const params = [];
  if (league) { sql += ' WHERE s.league = ?'; params.push(league); }
  sql += ' ORDER BY s.league, t.name, s.round_number';
  const rows = db.prepare(sql).all(...params);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Scores');

  const lb = db.prepare(`
    SELECT t.name as team_name, t.league, MAX(s.final_total) as best_score, COUNT(s.id) as rounds_played
    FROM teams t LEFT JOIN score_entries s ON s.team_id = t.id
    ${league ? 'WHERE t.league = ?' : ''}
    GROUP BY t.id ORDER BY t.league, best_score DESC
  `).all(...(league ? [league] : []));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lb), 'Leaderboard');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="robocup-scores.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
