export function normalizeSjson(scoring) {
  const obj = typeof scoring === 'string' ? JSON.parse(scoring) : scoring;
  const normalized = { scoring_method: 'sum' };

  // Normalize dimensions
  normalized.dimensions = {};
  if (obj.dimensions && typeof obj.dimensions === 'object') {
    for (const [dimKey, dim] of Object.entries(obj.dimensions)) {
      if (!dim || typeof dim !== 'object') continue;
      const normDim = {};
      normDim.label = typeof dim.label === 'string' ? dim.label : dimKey;
      normDim.question_ids = Array.isArray(dim.question_ids)
        ? dim.question_ids.map(String)
        : [];
      normDim.results = Array.isArray(dim.results)
        ? dim.results
          .filter(r => r && typeof r === 'object' && typeof r.min === 'number' && typeof r.max === 'number')
          .map(r => ({
            min: r.min,
            max: r.max,
            label: typeof r.label === 'string' ? r.label : '',
            description: typeof r.description === 'string' ? r.description : '',
          }))
        : [];
      normalized.dimensions[dimKey] = normDim;
    }
  }

  const dimensionKeys = new Set(Object.keys(normalized.dimensions));

  // Normalize questions
  normalized.questions = {};
  if (obj.questions && typeof obj.questions === 'object') {
    const sortedQKeys = Object.keys(obj.questions).sort((a, b) => Number(a) - Number(b));
    for (const qKey of sortedQKeys) {
      const q = obj.questions[qKey];
      if (!q || typeof q !== 'object') continue;
      const weight = q.weight === 0 ? 0 : 1;
      const dimension = typeof q.dimension === 'string' && dimensionKeys.has(q.dimension)
        ? q.dimension
        : null;
      const options = {};
      if (q.options && typeof q.options === 'object') {
        for (const [optKey, val] of Object.entries(q.options)) {
          const num = Number(val);
          if (!Number.isNaN(num)) options[optKey] = num;
        }
      }
      normalized.questions[qKey] = { weight, dimension, options };
    }
  }

  return normalized;
}

export function normalizeQjson(survey) {
  const obj = typeof survey === 'string' ? JSON.parse(survey) : survey;
  const normalized = {};
  if (obj.title !== undefined) normalized.title = obj.title;
  if (obj.subtitle !== undefined) normalized.subtitle = obj.subtitle;
  if (obj.description !== undefined) normalized.description = obj.description;
  if (obj.type !== undefined) normalized.type = obj.type;
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
