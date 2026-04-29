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

// Log API requests
const API_PATHS = ['/survey', '/surveys', '/record', '/records', '/generate/prompt', '/generate/qjson', '/generate/sjson', '/generate/analysis'];
app.use((req, _res, next) => {
  if (API_PATHS.some(p => req.url === p || req.url.startsWith(p + '?'))) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const body = Object.keys(req.body || {}).length ? ' ' + JSON.stringify(req.body) : '';
    const line = `${new Date().toISOString()} ${ip} ${req.method} ${req.url}${body}\n`;
    logStream.write(line);
  }
  next();
});

// Init SQLite
const db = new Database(path.join(__dirname, 'db.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL DEFAULT '',
    survey TEXT NOT NULL UNIQUE,
    scoring TEXT DEFAULT '',
    is_deleted INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time INTEGER NOT NULL,
    time_h TEXT NOT NULL,
    survey_id INTEGER NOT NULL,
    result TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    analysis TEXT NOT NULL DEFAULT '',
    is_deleted INTEGER NOT NULL DEFAULT 0
  )
`);

// Get survey by id
app.get('/survey', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  const row = db.prepare('SELECT prompt, survey, scoring FROM surveys WHERE id = ? AND is_deleted = 0').get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ prompt: row.prompt || '', survey: JSON.parse(row.survey), scoring: row.scoring ? JSON.parse(row.scoring) : "" });
});

// Distinct surveys for survey list
app.get('/surveys', (_req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.survey, COUNT(r.id) as count
    FROM surveys s
    LEFT JOIN records r ON r.survey_id = s.id AND r.is_deleted = 0
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
  const { prompt = '', survey, scoring } = req.body;
  if (!survey) return res.status(400).json({ error: 'Missing survey' });
  const surveyJson = JSON.stringify(survey);
  const scoringJson = scoring ? JSON.stringify(scoring) : "";
  const existing = db.prepare('SELECT id, is_deleted FROM surveys WHERE survey = ?').get(surveyJson);
  if (existing) {
    if (existing.is_deleted) {
      db.prepare('UPDATE surveys SET is_deleted = 0, prompt = ?, scoring = ? WHERE id = ?').run(prompt, scoringJson, existing.id);
    }
    return res.json({ id: existing.id });
  }
  const info = db.prepare('INSERT INTO surveys (prompt, survey, scoring) VALUES (?, ?, ?)').run(prompt, surveyJson, scoringJson);
  res.json({ id: info.lastInsertRowid });
});

// Soft delete all records for a survey
app.delete('/survey', (req, res) => {
  const { id } = req.body;
  if (id) {
    const row = db.prepare('SELECT id FROM surveys WHERE id = ? AND is_deleted = 0').get(id);
    if (!row) return res.status(404).json({ error: 'Survey not found' });
    db.prepare('UPDATE surveys SET is_deleted = 1 WHERE id = ?').run(id);
  } else {
    return res.status(400).json({ error: 'Missing id or survey' });
  }
  db.prepare('UPDATE records SET is_deleted = 1 WHERE survey_id = ?').run(id);
  res.json({ ok: true });
});

// Record survey result
app.post('/record', (req, res) => {
  const { survey_id, result, email } = req.body;
  if (!survey_id || !result) {
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

  const resultJson = JSON.stringify(normalizedResult);
  const emailVal = typeof email === 'string' ? email.trim() : '';

  const stmt = db.prepare(
    'INSERT INTO records (time, time_h, survey_id, result, email) VALUES (?, ?, ?, ?, ?)'
  );
  const info = stmt.run(time, time_h, survey_id, resultJson, emailVal);

  res.json({ id: info.lastInsertRowid, time, time_h });
});

// Get a single record by id
app.get('/record', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id param' });

  const row = db.prepare('SELECT * FROM records WHERE id = ? AND is_deleted = 0').get(id);
  if (!row) return res.status(404).json({ error: 'Record not found' });

  res.set('Cache-Control', 'no-store');
  res.json({ ...row, result: JSON.parse(row.result), email: row.email || '' });
});

// Update a record's analysis text
app.patch('/record', (req, res) => {
  const { id, analysis } = req.body;
  if (!id || typeof analysis !== 'string') return res.status(400).json({ error: 'Missing id or analysis' });
  const info = db.prepare('UPDATE records SET analysis = ? WHERE id = ? AND is_deleted = 0').run(analysis, id);
  if (info.changes === 0) return res.status(404).json({ error: 'Record not found' });
  res.json({ ok: true });
});

// Get survey result records by survey id
app.get('/records', (req, res) => {
  const { survey_id } = req.query;
  if (!survey_id) return res.status(400).json({ error: 'Missing survey_id param' });

  const rows = db.prepare(
    'SELECT * FROM records WHERE survey_id = ? AND is_deleted = 0 ORDER BY time DESC'
  ).all(survey_id);

  res.set('Cache-Control', 'no-store');
  res.json(rows.map(r => ({
    ...r,
    result: JSON.parse(r.result),
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
  "type": "common",
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
* The root-level "type" field must be "common" or "assessment_scale" or "ai_analysis".
  Use "assessment_scale" when the survey is a psychological or behavioral scale where each question has scored options and the total score maps to a result level (e.g. stress tests, personality inventories, health screeners, risk assessments).
  Use "ai_analysis" when the survey is specifically designed for generating personalized AI analysis reports based on the respondent's answers (e.g. open-ended questions for mental health journaling, detailed feedback forms, or any survey where the main value is in the qualitative analysis rather than quantitative scoring).
  Use "common" for all other surveys (feedback forms, polls, quizzes, satisfaction surveys, event registrations, etc.).
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

app.post('/generate/sjson', async (req, res) => {
  const { prompt, survey } = req.body;
  if (!survey) return res.status(400).json({ error: 'Missing survey' });

  try {
    const systemPrompt = `You are a survey scoring JSON generator for scale-based psychological questionnaires.

Given a survey JSON, generate a scoring JSON in this exact format:

{
  "scoring_method": "sum",
  "dimensions": {
    "anxiety": {
      "label": "Anxiety",
      "question_ids": ["1", "3"],
      "results": [
        { "min": 0,  "max": 6,  "label": "Low",       "description": "Minimal anxiety indicators." },
        { "min": 7,  "max": 12, "label": "Moderate",  "description": "Some anxiety present." },
        { "min": 13, "max": 18, "label": "High",      "description": "Significant anxiety present." }
      ]
    },
    "depression": {
      "label": "Depression",
      "question_ids": ["2", "4"],
      "results": [
        { "min": 0,  "max": 5,  "label": "Low",   "description": "Minimal depressive indicators." },
        { "min": 6,  "max": 10, "label": "High",  "description": "Notable depressive indicators." }
      ]
    }
  },
  "questions": {
    "1": { "weight": 1, "dimension": "anxiety",    "options": { "1": 3, "2": 2, "3": 1, "4": 0 } },
    "2": { "weight": 1, "dimension": "depression", "options": { "1": 0, "2": 1, "3": 2, "4": 3 } },
    "3": { "weight": 1, "dimension": "anxiety",    "options": { "true": 1, "false": 0 } },
    "4": { "weight": 0, "dimension": null,         "options": {} }
  }
}

Rules:
* "scoring_method" must be "sum".
* Always use the "dimensions" structure — even for a single-dimension survey, create one dimension entry (e.g. "overall").
* Decide how many dimensions based on the survey content: if all questions measure one construct use one dimension; if questions cluster into distinct sub-scales create one dimension per sub-scale.
* Each dimension has:
  - "label": a human-readable name.
  - "question_ids": array of question keys that belong to this dimension.
  - "results": 3–5 non-overlapping ranges covering the full achievable score for that dimension.
* For each question:
  - "weight": 1 for scored questions, 0 for open-text (type "text").
  - "dimension": the dimension key this question belongs to, or null if unscored (weight 0).
  - "options": map option keys to numeric scores.
    - type "text" → "options": {}
    - type "true_false" → keys "true" and "false"
    - type "single" / "multi" → same option keys as in the survey JSON
* Score direction: higher score = more of the trait being measured.
* Result ranges must be non-overlapping and cover the full achievable score range for that dimension.
* Labels and descriptions must be meaningful and tailored to the survey topic.`;

    const userPrompt = prompt ?
      `Here is the original prompt used to generate the survey:\n\n${prompt}\n\nSurvey JSON:\n${JSON.stringify(survey, null, 2)}`
      :
      `Survey JSON:\n${JSON.stringify(survey, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });
    const scoring = JSON.parse(completion.choices[0].message.content);
    res.json({ scoring });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate AI analysis report for an assessment scale record (streaming text)
app.post('/generate/analysis', async (req, res) => {
  const { userPrompt, lang } = req.body;
  if (!userPrompt) return res.status(400).json({ error: 'Missing userPrompt' });

  const langName = { en: 'English', zh: 'Chinese', ja: 'Japanese' }[lang] || 'English';

  const systemPrompt = `You are a thoughtful assessment-scale analyst. Given an assessment-scale survey and one respondent's answers and computed scores, write a personalized analysis report for the respondent.

Report requirements:
* Write in ${langName}.
* Address the respondent in second person ("you").
* Open with a brief overall summary (2-3 sentences) of what the scores indicate.
* Then for each dimension, write a short paragraph interpreting the score and level in plain language, grounded in the respondent's actual answers when relevant.
* Close with a short "Suggestions" section: 2-4 concrete, supportive, non-clinical suggestions tailored to the result.
* Output plain text only. Do NOT use any Markdown — no #, *, _, \`, -, >, or similar formatting characters. Use blank lines to separate paragraphs and sections.
* Do not invent dimensions or scores that are not in the input. Do not give medical diagnoses.
* Keep the whole report concise — aim for under 400 words.`;

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
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
