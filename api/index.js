const path = require('path');

// Load root .env when running locally (`node api/index.js` / `npm start`).
// Vercel injects env vars itself, so skip there.
if (process.env.VERCEL !== '1') {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const { pool, initDb } = require('./db');
const { LEAGUES, calculateTotals } = require('./scoringConfig');
const { createToken, validateCredentials, authMiddleware, getAuthConfig } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

if (!getAuthConfig().password) {
  console.warn('WARNING: AUTH_PASSWORD is not set — login will be disabled until you configure it.');
}

// Make sure tables exist before handling any request. initDb() caches its
// promise, so this is cheap after the first call.
app.use(async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (err) {
    console.error('DB init failed:', err);
    res.status(500).json({ error: 'خطا در اتصال به پایگاه داده' });
  }
});

// ---------- Auth ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!getAuthConfig().password) {
    return res.status(503).json({ error: 'احراز هویت پیکربندی نشده است' });
  }
  if (!validateCredentials(username, password)) {
    return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
  }
  res.json({ token: createToken(username), username });
});

app.use('/api', (req, res, next) => {
  if (req.path === '/login' && req.method === 'POST') return next();
  authMiddleware(req, res, next);
});

// ---------- Config ----------
app.get('/api/config', (req, res) => {
  res.json(LEAGUES);
});

// ---------- Teams ----------
app.get('/api/teams', async (req, res) => {
  const { league } = req.query;
  const { rows } = league
    ? await pool.query('SELECT * FROM teams WHERE league = $1 ORDER BY name', [league])
    : await pool.query('SELECT * FROM teams ORDER BY league, name');
  res.json(rows);
});

app.post('/api/teams', async (req, res) => {
  const { name, league } = req.body;
  if (!name || !LEAGUES[league]) {
    return res.status(400).json({ error: 'نام تیم یا رده لیگ نامعتبر است' });
  }
  const { rows } = await pool.query(
    'INSERT INTO teams (name, league) VALUES ($1, $2) RETURNING id',
    [name.trim(), league]
  );
  res.json({ id: rows[0].id, name: name.trim(), league });
});

app.delete('/api/teams/:id', async (req, res) => {
  await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ---------- Score entries ----------
app.get('/api/scores', async (req, res) => {
  const { team_id, league } = req.query;
  let sql = `SELECT s.*, t.name as team_name FROM score_entries s JOIN teams t ON t.id = s.team_id WHERE 1=1`;
  const params = [];
  if (team_id) { params.push(team_id); sql += ` AND s.team_id = $${params.length}`; }
  if (league) { params.push(league); sql += ` AND s.league = $${params.length}`; }
  sql += ' ORDER BY s.created_at DESC';
  const { rows } = await pool.query(sql, params);
  res.json(rows.map((r) => ({ ...r, values_json: JSON.parse(r.values_json) })));
});

app.post('/api/scores', async (req, res) => {
  const { team_id, league, round_number, values, judge_name, round_time_seconds } = req.body;
  if (!team_id || !LEAGUES[league] || !round_number) {
    return res.status(400).json({ error: 'ورودی نامعتبر است (تیم، لیگ یا شماره راند)' });
  }
  const timeSeconds = round_time_seconds != null && round_time_seconds !== ''
    ? Math.max(0, Number(round_time_seconds) || 0)
    : null;
  const totals = calculateTotals(league, values || {});
  const { rows } = await pool.query(
    `INSERT INTO score_entries
       (team_id, league, round_number, values_json, performance_total, technical_total, negative_total, group_total, final_total, round_time_seconds, judge_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      team_id, league, round_number, JSON.stringify(values || {}),
      totals.performance.total, totals.technical.total, totals.negative.total, totals.group.total, totals.final_total,
      timeSeconds,
      judge_name || null,
    ]
  );
  res.json({ id: rows[0].id, ...totals });
});

app.put('/api/scores/:id', async (req, res) => {
  const { values, round_number, judge_name } = req.body;
  const { rows: existingRows } = await pool.query('SELECT * FROM score_entries WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'رکورد یافت نشد' });
  const totals = calculateTotals(existing.league, values || {});
  await pool.query(
    `UPDATE score_entries
     SET values_json=$1, performance_total=$2, technical_total=$3, negative_total=$4, group_total=$5, final_total=$6, round_number=$7, judge_name=$8
     WHERE id=$9`,
    [
      JSON.stringify(values || {}), totals.performance.total, totals.technical.total, totals.negative.total,
      totals.group.total, totals.final_total, round_number || existing.round_number, judge_name || existing.judge_name,
      req.params.id,
    ]
  );
  res.json({ id: Number(req.params.id), ...totals });
});

app.delete('/api/scores/:id', async (req, res) => {
  await pool.query('DELETE FROM score_entries WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ---------- Leaderboard (best round per team; tie-break by lower time) ----------
app.get('/api/leaderboard', async (req, res) => {
  const { league } = req.query;
  let sql = `
    WITH best_rounds AS (
      SELECT DISTINCT ON (s.team_id)
        s.team_id,
        s.final_total,
        s.round_time_seconds
      FROM score_entries s
      ORDER BY s.team_id, s.final_total DESC, s.round_time_seconds ASC NULLS LAST, s.id ASC
    )
    SELECT t.id as team_id, t.name as team_name, t.league,
           br.final_total as best_score,
           br.round_time_seconds as best_time_seconds,
           COUNT(s.id) as rounds_played
    FROM teams t
    LEFT JOIN best_rounds br ON br.team_id = t.id
    LEFT JOIN score_entries s ON s.team_id = t.id
  `;
  const params = [];
  if (league) { params.push(league); sql += ` WHERE t.league = $${params.length}`; }
  sql += `
    GROUP BY t.id, t.name, t.league, br.final_total, br.round_time_seconds
    ORDER BY (br.final_total IS NULL), br.final_total DESC NULLS LAST, br.round_time_seconds ASC NULLS LAST, t.name ASC
  `;
  try {
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Leaderboard query failed:', err);
    res.status(500).json({ error: 'خطا در بارگذاری رده‌بندی' });
  }
});

// ---------- Export to Excel ----------
app.get('/api/export', async (req, res) => {
  const { league } = req.query;
  let sql = `SELECT t.name as team_name, s.league, s.round_number,
                    s.performance_total, s.technical_total, s.negative_total, s.group_total, s.final_total,
                    s.round_time_seconds, s.judge_name, s.created_at
             FROM score_entries s JOIN teams t ON t.id = s.team_id`;
  const params = [];
  if (league) { params.push(league); sql += ' WHERE s.league = $1'; }
  sql += ' ORDER BY s.league, t.name, s.round_number';
  const { rows } = await pool.query(sql, params);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Scores');

  const lbSql = `
    WITH best_rounds AS (
      SELECT DISTINCT ON (s.team_id)
        s.team_id,
        s.final_total,
        s.round_time_seconds
      FROM score_entries s
      ORDER BY s.team_id, s.final_total DESC, s.round_time_seconds ASC NULLS LAST, s.id ASC
    )
    SELECT t.name as team_name, t.league, br.final_total as best_score,
           br.round_time_seconds as best_time_seconds, COUNT(s.id) as rounds_played
    FROM teams t
    LEFT JOIN best_rounds br ON br.team_id = t.id
    LEFT JOIN score_entries s ON s.team_id = t.id
    ${league ? 'WHERE t.league = $1' : ''}
    GROUP BY t.id, t.name, t.league, br.final_total, br.round_time_seconds
    ORDER BY t.league, br.final_total DESC NULLS LAST, br.round_time_seconds ASC NULLS LAST, t.name ASC
  `;
  const { rows: lb } = await pool.query(lbSql, league ? [league] : []);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lb), 'Leaderboard');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="robocup-scores.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Locally (npm start / node api/index.js) we still want a normal running
// server. On Vercel, this file is imported and wrapped as a function, so
// app.listen is skipped there.
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
