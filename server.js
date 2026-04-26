import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve built frontend
app.use(express.static(path.join(__dirname, 'dist')));

// Init SQLite
const db = new Database(path.join(__dirname, 'db.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time INTEGER NOT NULL,
    time_h TEXT NOT NULL,
    survey TEXT NOT NULL,
    result TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT ''
  )
`);

// POST /surveyresult
app.post('/surveyresult', (req, res) => {
  const { survey, result, email } = req.body;
  if (!survey || !result) {
    return res.status(400).json({ error: 'Missing survey or result' });
  }

  const now = Date.now();
  const time = Math.floor(now / 1000);
  const time_h = new Date(now).toISOString().replace('T', ' ').substring(0, 19);

  // Normalize result keys order (sort question keys numerically)
  const resultObj = typeof result === 'string' ? JSON.parse(result) : result;
  const normalizedResult = Object.keys(resultObj)
    .sort((a, b) => Number(a) - Number(b))
    .reduce((acc, k) => { acc[k] = resultObj[k]; return acc; }, {});

  const surveyJson = JSON.stringify(survey);
  const resultJson = JSON.stringify(normalizedResult);
  const emailVal = typeof email === 'string' ? email.trim() : '';

  const stmt = db.prepare(
    'INSERT INTO records (time, time_h, survey, result, email) VALUES (?, ?, ?, ?, ?)'
  );
  const info = stmt.run(time, time_h, surveyJson, resultJson, emailVal);

  res.json({ id: info.lastInsertRowid, time, time_h });
});

// GET /surveys — distinct surveys with response counts
app.get('/surveys', (req, res) => {
  const rows = db.prepare(
    'SELECT survey, COUNT(*) as count FROM records GROUP BY survey ORDER BY MAX(time) DESC'
  ).all();

  const surveys = rows.map(r => ({
    survey: JSON.parse(r.survey),
    count: r.count,
  }));

  res.json(surveys);
});

// GET /surveyresults?survey=...
app.get('/surveyresults', (req, res) => {
  const { survey } = req.query;
  if (!survey) {
    return res.status(400).json({ error: 'Missing survey param' });
  }

  const rows = db.prepare(
    'SELECT * FROM records WHERE survey = ? ORDER BY time DESC'
  ).all(survey);

  res.json(rows.map(r => ({
    ...r,
    result: JSON.parse(r.result),
    survey: JSON.parse(r.survey),
    email: r.email || '',
  })));
});

// Catch-all: serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
