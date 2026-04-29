import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { computeScore } from "@utils/scoringUtils";
import { AnalysisCard } from "../AnalysisCard";
import styles from "./scale.module.css";

const LEVEL_COLORS = ["#aee9c7", "#ffd6a0", "#ffb6c9", "#b3d4fc", "#cbb7fa", "#a0e8fa", "#fff3a0"];

export default function ScaleResults({ record, scoring, surveyId, recordId }) {
  if (!scoring?.dimensions || !record) return null;

  const { dimensions, questions: qConfig } = scoring;

  const dimEntries = Object.entries(dimensions);

  const radarData = dimEntries.map(([, dim]) => {
    const { score } = computeScore(record, dim, qConfig);
    const fullMark = Math.max(...dim.results.map((r) => r.max));
    return { subject: dim.label, score, fullMark };
  });

  return (
    <div className={styles.dimensions}>
      {radarData.length >= 3 && (
        <div className="card">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
              <Tooltip
                isAnimationActive={false}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const { subject, score } = payload[0].payload;
                  return (
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        fontSize: "12px",
                        padding: "2px 8px",
                        lineHeight: 1.4,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{subject}</div>
                      <div style={{ color: "#6366f1" }}>{score.toFixed(1)}</div>
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {dimEntries.map(([dimKey, dim]) => {
        const { score, matchIdx } = computeScore(record, dim, qConfig);

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

      <AnalysisCard surveyId={surveyId} recordId={recordId} />
    </div>
  );
}
