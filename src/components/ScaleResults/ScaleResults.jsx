import styles from "./scale.module.css";

const LEVEL_COLORS = ["#aee9c7", "#ffd6a0", "#ffb6c9", "#b3d4fc", "#cbb7fa", "#a0e8fa", "#fff3a0"];

function computeScore(record, dimKey, dim, qConfig) {
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

export default function ScaleResults({ record, analysis }) {
  if (!analysis?.dimensions || !record) return null;

  const { dimensions, questions: qConfig } = analysis;

  return (
    <div className={styles.dimensions}>
      {Object.entries(dimensions).map(([dimKey, dim]) => {
        const { score, matchIdx } = computeScore(record, dimKey, dim, qConfig);

        return (
          <div key={dimKey} className="card">
            <div className="card-header">
              <div className="card-title">{dim.label}</div>
              <span className="badge">{score.toFixed(1)}</span>
            </div>
            <div className={styles.levels}>
              {dim.results.map((r, i) => {
                const isMatch = i === matchIdx;
                const levelColor = LEVEL_COLORS[i % LEVEL_COLORS.length];
                return (
                  <div
                    key={i}
                    className={`${styles.level} ${isMatch ? styles.levelMatch : ""}`}
                    style={isMatch ? { background: `${levelColor}33` } : {}}
                  >
                    <div className={styles.levelHeader}>
                      <span className={styles.levelDot} style={{ background: isMatch ? levelColor : "#ddd" }} />
                      <span className={`${styles.levelLabel} ${isMatch ? styles.levelLabelMatch : styles.levelLabelInactive}`}>
                        {r.label}
                      </span>
                      {isMatch && (
                        <span className={styles.levelRange}>
                          {r.min}–{r.max}
                        </span>
                      )}
                    </div>
                    {isMatch && r.description && <div className={styles.levelDesc}>{r.description}</div>}
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
