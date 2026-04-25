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
  CREATE TABLE IF NOT EXISTS surveyresults (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time INTEGER NOT NULL,
    time_h TEXT NOT NULL,
    survey TEXT NOT NULL,
    result TEXT NOT NULL
  )
`);

// POST /surveyresult
app.post('/surveyresult', (req, res) => {
  const { survey, result } = req.body;
  if (!survey || !result) {
    return res.status(400).json({ error: 'Missing survey or result' });
  }

  const now = Date.now();
  const time = Math.floor(now / 1000);
  const time_h = new Date(now).toISOString().replace('T', ' ').substring(0, 19);

  const surveyJson = typeof survey === 'string' ? survey : JSON.stringify(survey);
  const resultJson = typeof result === 'string' ? result : JSON.stringify(result);

  const stmt = db.prepare(
    'INSERT INTO surveyresults (time, time_h, survey, result) VALUES (?, ?, ?, ?)'
  );
  const info = stmt.run(time, time_h, surveyJson, resultJson);

  res.json({ id: info.lastInsertRowid, time, time_h });
});

// GET /surveyresults?survey=...
app.get('/surveyresults', (req, res) => {
  const { survey } = req.query;
  if (!survey) {
    return res.status(400).json({ error: 'Missing survey param' });
  }

  const rows = db.prepare(
    'SELECT * FROM surveyresults WHERE survey = ? ORDER BY time DESC'
  ).all(survey);

  res.json(rows.map(r => ({
    ...r,
    result: JSON.parse(r.result),
    survey: JSON.parse(r.survey),
  })));
});

// Catch-all: serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
