export function parseSurveyObj(obj) {
  const title = obj.title || null;
  const subtitle = obj.subtitle || "";
  const description = obj.description || "";
  const questions = [];
  if (obj.questions) {
    for (const [qKey, q] of Object.entries(obj.questions)) {
      const answers = [];
      if (q.options) {
        for (const [optKey, optLabel] of Object.entries(q.options)) {
          answers.push({ key: optKey, label: optLabel });
        }
      }
      questions.push({ key: qKey, text: q.title || "", description: q.description || "", answers });
    }
  }
  return { title, subtitle, description, questions, surveyObj: obj };
}

export function parseSurvey(search) {
  const params = new URLSearchParams(search);
  const dataStr = params.get("q");
  if (!dataStr) return { title: null, subtitle: "", description: "", questions: [], surveyObj: {} };
  let obj;
  try {
    obj = JSON.parse(dataStr);
  } catch {
    return { title: null, subtitle: "", description: "", questions: [], surveyObj: {} };
  }
  return parseSurveyObj(obj);
}
