export function parseSurveyObj(obj) {
  const title = obj.title || null;
  const subtitle = obj.subtitle || "";
  const description = obj.description || "";
  const type = obj.type || "common";
  const questions = [];
  if (obj.questions) {
    for (const [qKey, q] of Object.entries(obj.questions)) {
      const answers = [];
      if (q.options) {
        for (const [optKey, optLabel] of Object.entries(q.options)) {
          answers.push({ key: optKey, label: optLabel });
        }
      }
      const validTypes = ["multi", "single", "true_false", "text"];
      const type = validTypes.includes(q.type) ? q.type : "single";
      questions.push({ key: qKey, text: q.title || "", description: q.description || "", type, hasOtherOption: !!q.has_other_option, answers });
    }
  }
  return { title, subtitle, description, type, questions, surveyObj: obj };
}
