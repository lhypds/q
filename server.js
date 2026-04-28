import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});
const MODEL = process.env.MODEL || 'gpt-4o';

const logStream = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const body = Object.keys(req.body || {}).length ? ' ' + JSON.stringify(req.body) : '';
  const line = `${new Date().toISOString()} ${ip} ${req.method} ${req.url}${body}\n`;
  logStream.write(line);
  next();
});

// Init SQLite
const db = new Database(path.join(__dirname, 'db.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL DEFAULT '',
    survey TEXT NOT NULL UNIQUE,
    is_deleted INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time INTEGER NOT NULL,
    time_h TEXT NOT NULL,
    survey TEXT NOT NULL,
    result TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    is_deleted INTEGER NOT NULL DEFAULT 0
  )
`);

// Get survey by id
app.get('/survey', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  const row = db.prepare('SELECT survey FROM surveys WHERE id = ? AND is_deleted = 0').get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ survey: JSON.parse(row.survey) });
});

// Distinct surveys for survey list
app.get('/surveys', (_req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.survey, COUNT(r.id) as count
    FROM surveys s
    LEFT JOIN records r ON r.survey = s.survey AND r.is_deleted = 0
    WHERE s.is_deleted = 0
    GROUP BY s.id
    ORDER BY MAX(r.time) DESC
  `).all();

  const surveys = rows.map(r => ({
    id: r.id,
    survey: JSON.parse(r.survey),
    count: r.count,
  }));

  res.set('Cache-Control', 'no-store');
  res.json(surveys);
});

// Upsert survey, return id
app.post('/survey', (req, res) => {
  const { prompt = '', survey } = req.body;
  if (!survey) return res.status(400).json({ error: 'Missing survey' });
  const surveyJson = JSON.stringify(survey);
  const existing = db.prepare('SELECT id, is_deleted FROM surveys WHERE survey = ?').get(surveyJson);
  if (existing) {
    if (existing.is_deleted) {
      db.prepare('UPDATE surveys SET is_deleted = 0, prompt = ? WHERE id = ?').run(prompt, existing.id);
    }
    return res.json({ id: existing.id });
  }
  const info = db.prepare('INSERT INTO surveys (prompt, survey) VALUES (?, ?)').run(prompt, surveyJson);
  res.json({ id: info.lastInsertRowid });
});

// Soft delete all records for a survey
app.delete('/survey', (req, res) => {
  const { id, survey } = req.body;
  let surveyJson;
  if (id) {
    const row = db.prepare('SELECT survey FROM surveys WHERE id = ? AND is_deleted = 0').get(id);
    if (!row) return res.status(404).json({ error: 'Survey not found' });
    surveyJson = row.survey;
    db.prepare('UPDATE surveys SET is_deleted = 1 WHERE id = ?').run(id);
  } else if (survey) {
    surveyJson = JSON.stringify(survey);
    db.prepare('UPDATE surveys SET is_deleted = 1 WHERE survey = ?').run(surveyJson);
  } else {
    return res.status(400).json({ error: 'Missing id or survey' });
  }
  db.prepare('UPDATE records SET is_deleted = 1 WHERE survey = ?').run(surveyJson);
  res.json({ ok: true });
});

// Record survey result
app.post('/record', (req, res) => {
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

// Get survey result records by survey id
app.get('/records', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id param' });

  const surveyRow = db.prepare('SELECT survey FROM surveys WHERE id = ? AND is_deleted = 0').get(id);
  if (!surveyRow) return res.status(404).json({ error: 'Survey not found' });

  const rows = db.prepare(
    'SELECT * FROM records WHERE survey = ? AND is_deleted = 0 ORDER BY time DESC'
  ).all(surveyRow.survey);

  res.set('Cache-Control', 'no-store');
  res.json(rows.map(r => ({
    ...r,
    result: JSON.parse(r.result),
    survey: JSON.parse(r.survey),
    email: r.email || '',
  })));
});

// Generate survey questions outline from topic
app.post('/generate/prompt', async (req, res) => {
  const { topic, currentPrompt, modification } = req.body;

  const systemPrompt = modification
    ?
    'You are a survey designer. AI generated a survey based on the previous input. Now, user want to modify it. So, rewrite the given survey based on the modification request. But only return the rewritten survey without any explanation.'
    :
    'You are a survey designer. First, generate the description for the survey. Then, produce a concise numbered list of survey questions with answer options. Some questions may allow multiple selections — mark those with "[multi]" after the question number. Add some descriptions for each question as needed. Be clear and friendly, but with a rich description. Only return the survey (include descriptions) but without any explanation.';

  const userPrompt = modification
    ? `Survey:\n\n${currentPrompt}\n\nModification request:\n\n${modification}\n\n`
    : `Create survey about:\n\n${topic}`;

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
    { role: 'user', content: userPrompt },
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      messages,
    });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) res.write(text);
    }
    res.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate q.json structure from topic and questions outline
app.post('/generate/qjson', async (req, res) => {
  const { topic, prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  try {

    const systemPrompt = `You are a survey JSON generator. Convert the questions outline into this exact JSON format (example):  

{
  "title": "Sample Title",
  "subtitle": "Sample subtitle",
  "description": "Sample description.",
  "questions": {
    "1": {
      "title": "Sample Title",
      "description": "Sample description.",
      "type": "single",
      "has_other_option": false,
      "options": {
        "1": "Option A",
        "2": "Option B",
        "3": "Option C"
      }
    },
    "2": {
      "title": "Sample Title",
      "description": "Sample description.",
      "type": "multi",
      "has_other_option": true,
      "options": {
        "1": "Option A",
        "2": "Option B",
        "3": "Option C"
      }
    },
    "3": {
      "title": "Sample Title",
      "description": "Sample description.",
      "type": "text",
      "has_other_option": false ,
      "options": {}
    },
    "4": {
      "title": "Sample Title",
      "description": "Sample description.",
      "type": "true_false",
      "has_other_option": false ,
      "options": {}
    }
  }
}

Explanation & requirements:  
* Better to add a "subtitle" and a "description".  
* The "type" of each question can be "single", "multi", "true_false", or "text".
  Use "type": "multi" for questions that allow multiple selections (marked with [multi] in the outline).  
  Use "type": "single" for single-choice questions.  
  Use "type": "true_false" for True/False questions.  
  Use "type": "text" for Open-ended or Short-answer questions.  
* Use "has_other_option": true, for questions that have an "Other" option for user free text input. If "has_other_option" is true, then no need to add a "Other" option in the options list.  
`;

    const userPrompt = topic ? `Topic: ${topic}\n\nQuestions outline:\n${prompt}` : `Questions outline:\n${prompt}`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });
    const survey = JSON.parse(completion.choices[0].message.content);
    res.json({ survey });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
