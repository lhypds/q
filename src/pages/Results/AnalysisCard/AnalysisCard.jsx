import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { computeScoringResult } from "@utils/scoringUtils";
import styles from "./analysis.module.css";

export default function AnalysisCard({ surveyId, recordId }) {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!surveyId || !recordId) return;
    let cancelled = false;

    (async () => {
      try {
        const [surveyRes, recordRes] = await Promise.all([
          fetch(`/survey?id=${surveyId}`),
          fetch(`/record?id=${recordId}`),
        ]);
        if (!surveyRes.ok) throw new Error(`Failed to load survey (${surveyRes.status})`);
        if (!recordRes.ok) throw new Error(`Failed to load record (${recordRes.status})`);
        const { prompt, survey, scoring } = await surveyRes.json();
        const record = await recordRes.json();
        if (cancelled) return;
        const scoringResult = scoring ? computeScoringResult(record, scoring) : null;

        const res = await fetch("/generate/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, survey, scoring, scoringResult, record, lang: i18n.language }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to generate analysis (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done: rDone, value } = await reader.read();
          if (rDone) break;
          if (cancelled) {
            reader.cancel();
            return;
          }
          setText((prev) => prev + decoder.decode(value, { stream: true }));
        }
        if (!cancelled) setDone(true);
      } catch (e) {
        console.error("[AnalysisCard]", e);
        if (!cancelled) setError(e.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [surveyId, recordId, i18n.language]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{t("results.analysisTitle")}</div>
      </div>
      {error ? (
        <div className="error-msg">{error}</div>
      ) : (
        <div className={styles.body}>
          {text || (!done && <span className={styles.placeholder}>…</span>)}
          {text && !done && <span className={styles.cursor} />}
        </div>
      )}
    </div>
  );
}
