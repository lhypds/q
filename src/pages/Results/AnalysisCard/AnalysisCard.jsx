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
        const [surveyRes, recordRes] = await Promise.all([fetch(`/survey?id=${surveyId}`), fetch(`/record?id=${recordId}`)]);

        if (!surveyRes.ok) throw new Error(`Failed to load survey (${surveyRes.status})`);
        if (!recordRes.ok) throw new Error(`Failed to load record (${recordRes.status})`);

        const { prompt, survey, scoring } = await surveyRes.json();
        const record = await recordRes.json();
        if (cancelled) return;

        if (record.analysis) {
          setText(record.analysis);
          setDone(true);
          return;
        }

        const scoringResult = scoring ? computeScoringResult(record, scoring) : null;

        let userPrompt = "";

        if (survey.type === "assessment_scale") {
          userPrompt = [
            prompt ? `Survey design prompt:\n${prompt}` : null,
            `Survey JSON:\n${JSON.stringify(survey, null, 2)}`,
            scoring ? `Scoring JSON:\n${JSON.stringify(scoring, null, 2)}` : null,
            scoringResult ? `Scoring result:\n${JSON.stringify(scoringResult, null, 2)}` : null,
            `Record:\n${JSON.stringify(record, null, 2)}`,
          ]
            .filter(Boolean)
            .join("\n\n");
        }

        if (survey.type === "ai_analysis") {
          userPrompt = [
            prompt ? `Survey design prompt:\n${prompt}` : null,
            `Survey JSON:\n${JSON.stringify(survey, null, 2)}`,
            `Record:\n${JSON.stringify(record, null, 2)}`,
          ]
            .filter(Boolean)
            .join("\n\n");
        }

        const res = await fetch("/generate/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userPrompt, lang: i18n.language }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to generate analysis (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let accumulated = "";
        while (true) {
          const { done: rDone, value } = await reader.read();
          if (rDone) break;
          if (cancelled) {
            reader.cancel();
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setText((prev) => prev + chunk);
        }
        if (cancelled) return;

        setDone(true);
        if (accumulated) {
          fetch("/record", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: recordId, analysis: accumulated }),
          }).catch((err) => console.error("[AnalysisCard] save failed", err));
        }
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
