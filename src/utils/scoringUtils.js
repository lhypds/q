export function computeScore(record, dim, qConfig) {
  let score = 0;
  for (const qId of dim.question_ids) {
    const qConf = qConfig?.[qId] || {};
    const answer = record.result?.[qId];
    if (answer === undefined || answer === null || answer === "") continue;
    let val;
    if (qConf.options && Object.keys(qConf.options).length > 0) {
      val = Number(qConf.options[String(answer)] ?? 0);
    } else {
      val = parseFloat(answer);
      if (isNaN(val)) val = 0;
    }
    score += val * (qConf.weight ?? 1);
  }
  const matchIdx = dim.results.findIndex((r) => score >= r.min && score <= r.max);
  return { score, matchIdx };
}

export function computeScoringResult(record, scoring) {
  if (!scoring?.dimensions || !record) return [];
  const { dimensions, questions: qConfig } = scoring;
  return Object.entries(dimensions).map(([dimKey, dim]) => {
    const { score, matchIdx } = computeScore(record, dim, qConfig);
    const matched = matchIdx >= 0 ? dim.results[matchIdx] : null;
    return {
      key: dimKey,
      label: dim.label,
      score,
      level: matched?.label ?? null,
      description: matched?.description ?? null,
    };
  });
}
