import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});
const MODEL = process.env.MODEL || 'gpt-4o';

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

// Record survey result
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

// Distinct surveys for survey list
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

// Get survery results
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

// Generate survey questions outline from topic
app.post('/generate/prompt', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Missing topic' });
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a survey designer. Given a topic, produce a concise numbered list of survey questions with multiple-choice answer options. Be clear and friendly.',
        },
        { role: 'user', content: `Create survey questions about: ${topic}` },
      ],
    });
    res.json({ prompt: completion.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate q.json structure from topic and questions outline
app.post('/generate/qjson', async (req, res) => {
  const { topic, prompt } = req.body;
  if (!topic || !prompt) return res.status(400).json({ error: 'Missing topic or prompt' });
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a survey JSON generator. Convert the questions outline into this exact JSON format:
{
  "title": "Survey title",
  "subtitle": "Optional subtitle",
  "description": "Optional description",
  "questions": {
    "1": {
      "title": "Question title",
      "description": "Optional question description",
      "options": { "1": "Option A", "2": "Option B" }
    }
  }
}
Return only valid JSON, no markdown or explanation.`,
        },
        { role: 'user', content: `Topic: ${topic}\n\nQuestions outline:\n${prompt}` },
      ],
      response_format: { type: 'json_object' },
    });
    const survey = JSON.parse(completion.choices[0].message.content);
    res.json({ survey });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Catch-all: serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
