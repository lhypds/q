import styles from "./assessmentResults.module.css";

const LEVEL_COLORS = ["#aee9c7", "#ffd6a0", "#ffb6c9", "#b3d4fc", "#cbb7fa", "#a0e8fa", "#fff3a0"];

function computeScores(records, analysis) {
  const { dimensions, questions: qConfig } = analysis;
  return records.map((record) => {
    const scores = {};
    for (const [dimKey, dim] of Object.entries(dimensions)) {
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
      scores[dimKey] = { score, matchIdx };
    }
    return scores;
  });
}

export default function AssessmentResults({ records, analysis }) {
  if (!analysis?.dimensions) return null;

  const scored = computeScores(records, analysis);
  const total = records.length;

  return (
    <div className={styles.dimensions}>
      {Object.entries(analysis.dimensions).map(([dimKey, dim]) => {
        const counts = dim.results.map(() => 0);
        let scoreSum = 0;
        let validCount = 0;

        scored.forEach((s) => {
          const d = s[dimKey];
          if (!d) return;
          scoreSum += d.score;
          validCount++;
          if (d.matchIdx >= 0) counts[d.matchIdx]++;
        });

        const avg = validCount > 0 ? (scoreSum / validCount).toFixed(1) : "-";

        return (
          <div key={dimKey} className="card">
            <div className="card-header">
              <div className="card-title">{dim.label}</div>
              <span className="badge">avg {avg}</span>
            </div>
            <div className={styles.levels}>
              {dim.results.map((r, i) => {
                const count = counts[i];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const color = LEVEL_COLORS[i % LEVEL_COLORS.length];
                return (
                  <div key={i} className={styles.level}>
                    <div className={styles.levelHeader}>
                      <span className={styles.levelDot} style={{ background: color }} />
                      <span className={styles.levelLabel}>{r.label}</span>
                      <span className={styles.levelCount}>
                        {count} <span className={styles.levelPct}>({pct}%)</span>
                      </span>
                    </div>
                    {r.description && <div className={styles.levelDesc}>{r.description}</div>}
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
