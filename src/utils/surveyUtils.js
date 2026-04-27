export function normalizeSurvey(survey) {
  const obj = typeof survey === 'string' ? JSON.parse(survey) : survey;
  const normalized = {};
  if (obj.title !== undefined) normalized.title = obj.title;
  if (obj.subtitle !== undefined) normalized.subtitle = obj.subtitle;
  if (obj.description !== undefined) normalized.description = obj.description;
  if (obj.questions && typeof obj.questions === 'object') {
    const sortedQKeys = Object.keys(obj.questions).sort((a, b) => Number(a) - Number(b));
    normalized.questions = {};
    sortedQKeys.forEach((qKey, qi) => {
      const newQKey = String(qi + 1);
      const q = obj.questions[qKey];
      const normQ = {};
      if (q.title !== undefined) normQ.title = q.title;
      if (q.description !== undefined) normQ.description = q.description;
      const validTypes = ["multi", "single", "true_false", "text"];
      normQ.type = validTypes.includes(q.type) ? q.type : "single";
      if (q.has_other_option) normQ.has_other_option = true;
      if (q.options && typeof q.options === 'object') {
        const sortedOptKeys = Object.keys(q.options).sort((a, b) => Number(a) - Number(b));
        normQ.options = {};
        sortedOptKeys.forEach((optKey, oi) => {
          normQ.options[String(oi + 1)] = q.options[optKey];
        });
      }
      normalized.questions[newQKey] = normQ;
    });
  }
  return normalized;
}
