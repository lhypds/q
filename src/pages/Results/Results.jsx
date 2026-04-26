import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import styles from "./results.module.css";
import { ActionButton, showToast } from "../../ui";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const COLORS = ["#a8c8fa", "#fac4a0", "#9de0bc", "#fab4c8", "#cdb0fa", "#faf0a0", "#a0e8fa"];

function parseSurvey(search) {
  const params = new URLSearchParams(search);
  const title = params.get("title") || "q";
  const surveyObj = {};
  for (const [k, v] of params.entries()) {
    if (k !== "view") surveyObj[k] = v;
  }
  const questions = [];
  let i = 1;
  while (params.has(`q${i}`)) {
    const qText = params.get(`q${i}`);
    const answers = [];
    let j = 1;
    while (params.has(`q${i}a${j}`)) {
      answers.push({ key: `q${i}a${j}`, label: params.get(`q${i}a${j}`) });
      j++;
    }
    questions.push({ key: `q${i}`, text: qText, answers });
    i++;
  }
  return { title, questions, surveyObj };
}

export default function Results() {
  const { title, questions, surveyObj } = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    return parseSurvey(url.search);
  }, []);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const surveyKey = useMemo(() => JSON.stringify(surveyObj), [surveyObj]);

  useEffect(() => {
    fetch(`/surveyresults?survey=${encodeURIComponent(surveyKey)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setResults(data);
        else setFetchError(data.error || "Failed to load");
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Failed to load results.");
        setLoading(false);
      });
  }, [surveyKey]);

  function getChartData(qKey, answers) {
    const counts = {};
    answers.forEach((a) => {
      counts[a.key] = 0;
    });
    results.forEach((r) => {
      const chosen = r.result[qKey];
      if (chosen && counts[chosen] !== undefined) counts[chosen]++;
    });
    return answers.map((a) => ({ name: a.label, value: counts[a.key] || 0 }));
  }

  const surveyUrl = (() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    return url.toString();
  })();

  async function handleShare() {
    const copied = await copyText(window.location.href);
    showToast(copied ? "Link copied to clipboard" : "Failed to copy link");
  }

  return (
    <div className="page">
      <div className={styles.titleRow}>
        <a href={surveyUrl} className={`page-title ${styles.titleLink}`}>
          {title}
        </a>

        <ActionButton tooltip="Share" onClick={handleShare}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98" />
            <path d="M15.41 6.51L8.59 10.49" />
          </svg>
        </ActionButton>
      </div>

      <div className={styles.subtitle}>
        {loading ? "Loading…" : `${results.length} response${results.length !== 1 ? "s" : ""} collected.`}
      </div>
      {fetchError && <p className="error-msg">{fetchError}</p>}

      <div className={styles.content}>
        {!loading &&
          questions.map((q) => {
            const data = getChartData(q.key, q.answers);
            const total = data.reduce((s, d) => s + d.value, 0);
            return (
              <div key={q.key} className="card">
                <div className="card-header">
                  <div className="card-title">{q.text}</div>
                  <span className="badge">{q.key}</span>
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
                        <Tooltip
                          formatter={(value, name) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]}
                        />
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
          })}
      </div>

      <div className="submit-row">
        <div></div>
        <a href={"/"} className="results-link small">
          q
        </a>
      </div>
    </div>
  );
}
