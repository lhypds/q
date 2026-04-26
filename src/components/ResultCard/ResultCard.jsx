import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import styles from "./resultCard.module.css";

const COLORS = ["#a8c8fa", "#fac4a0", "#9de0bc", "#fab4c8", "#cdb0fa", "#faf0a0", "#a0e8fa"];

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
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.legendCounts}>
            {data.map((d, idx) => (
              <div className={styles.legendItem} key={d.name}>
                <span className={styles.legendDot} style={{ background: COLORS[idx % COLORS.length] }} />
                <span className={styles.legendName}>{d.name}</span>
                <span className={styles.legendCount}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
