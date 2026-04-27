import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./card.module.css";

const COLORS = [
  "#b3d4fc", // soft blue
  "#ffd6a0", // soft orange
  "#aee9c7", // soft green
  "#ffb6c9", // soft pink
  "#cbb7fa", // soft purple
  "#fff3a0", // soft yellow
  "#a0e8fa", // soft cyan
];

function CardShell({ question, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{question.text}</div>
        <span className="badge">{question.key}</span>
      </div>
      {children}
    </div>
  );
}

export default function ResultCard({ question, results }) {
  const { t } = useTranslation();
  const [colorOffset] = useState(() => Math.floor(Math.random() * COLORS.length));

  if (question.type === "true_false") {
    const yesCount = results.filter((r) => r.result[question.key] === "true").length;
    const noCount = results.length - yesCount;
    const total = results.length;
    const data = [
      { name: t("questionCard.yes"), value: yesCount },
      { name: t("questionCard.no"), value: noCount },
    ];
    return (
      <CardShell question={question}>
        {total === 0 ? (
          <div className="card-desc">{t("results.noResponses")}</div>
        ) : (
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={0} outerRadius={100} paddingAngle={0} dataKey="value">
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[(colorOffset + idx) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]}
                  contentStyle={{ fontSize: "12px", padding: "2px 8px" }}
                />
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
      </CardShell>
    );
  }

  if (question.type === "text") {
    const responses = results.map((r) => r.result[question.key]).filter(Boolean);
    return (
      <CardShell question={question}>
        {responses.length === 0 ? (
          <div className="card-desc">{t("results.noResponses")}</div>
        ) : (
          <div className={styles.otherList}>
            <div className={styles.otherListTitle}>{t("results.collected", { count: responses.length })}:</div>
            {responses.map((text, i) => (
              <div key={i} className={styles.otherItem}>
                - {text}
              </div>
            ))}
          </div>
        )}
      </CardShell>
    );
  }

  // single and multi
  const counts = {};
  question.answers.forEach((a) => {
    counts[a.key] = 0;
  });
  results.forEach((r) => {
    const chosen = r.result[question.key];
    if (Array.isArray(chosen)) {
      chosen.forEach((k) => {
        if (counts[k] !== undefined) counts[k]++;
      });
    } else if (chosen && counts[chosen] !== undefined) {
      counts[chosen]++;
    }
  });

  const answerKeys = new Set(question.answers.map((a) => a.key));
  const otherTexts = question.hasOtherOption
    ? results
        .map((r) => {
          const chosen = r.result[question.key];
          if (Array.isArray(chosen)) return chosen.find((v) => !answerKeys.has(v)) ?? null;
          return chosen && !answerKeys.has(chosen) ? chosen : null;
        })
        .filter(Boolean)
    : [];

  const data = [
    ...question.answers.map((a) => ({ name: a.label, value: counts[a.key] || 0 })),
    ...(otherTexts.length > 0 ? [{ name: t("questionCard.otherOption"), value: otherTexts.length }] : []),
  ];

  const total =
    question.type === "multi"
      ? results.filter((r) => {
          const c = r.result[question.key];
          return Array.isArray(c) ? c.length > 0 : !!c;
        }).length
      : data.reduce((s, d) => s + d.value, 0);

  return (
    <CardShell question={question}>
      {total === 0 && otherTexts.length === 0 ? (
        <div className="card-desc">{t("results.noResponses")}</div>
      ) : (
        <>
          {total > 0 && (
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={0} outerRadius={100} paddingAngle={0} dataKey="value">
                    {data.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[(colorOffset + idx) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]}
                    contentStyle={{ fontSize: "12px", padding: "2px 8px" }}
                  />
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
          {otherTexts.length > 0 && (
            <div className={styles.otherList}>
              <div className={styles.otherListTitle}>{t("results.otherResponses")}</div>
              {otherTexts.map((text, i) => (
                <div key={i} className={styles.otherItem}>
                  - {text}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </CardShell>
  );
}
