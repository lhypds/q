import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";
import styles from "./resultCard.module.css";

const COLORS = [
  "#b3d4fc", // soft blue
  "#ffd6a0", // soft orange
  "#aee9c7", // soft green
  "#ffb6c9", // soft pink
  "#cbb7fa", // soft purple
  "#fff3a0", // soft yellow
  "#a0e8fa", // soft cyan
];

export default function ResultCard({ question, results }) {
  const counts = {};
  question.answers.forEach((a) => {
    counts[a.key] = 0;
  });
  results.forEach((r) => {
    const chosen = r.result[question.key];
    if (chosen && counts[chosen] !== undefined) counts[chosen]++;
  });
  const data = question.answers.map((a) => ({ name: a.label, value: counts[a.key] || 0 }));
  const total = data.reduce((s, d) => s + d.value, 0);

  // Randomize color start index
  const [colorOffset] = useState(() => Math.floor(Math.random() * COLORS.length));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{question.text}</div>
        <span className="badge">{question.key}</span>
      </div>
      {total === 0 ? (
        <div className="card-desc">No responses yet.</div>
      ) : (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={0} outerRadius={100} paddingAngle={0} dataKey="value">
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[(colorOffset + idx) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.legendCounts}>
            {data.map((d, idx) => {
              const percent = total ? Math.round((d.value / total) * 100) : 0;
              return (
                <div className={styles.legendItem} key={d.name}>
                  <span className={styles.legendDot} style={{ background: COLORS[(colorOffset + idx) % COLORS.length] }} />
                  <span className={styles.legendName}>{d.name}</span>
                  <span className={styles.legendCount}>
                    {d.value} <span className={styles.legendPercent}>({percent}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
