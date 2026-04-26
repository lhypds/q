import { useState, useEffect, useMemo } from "react";
import styles from "./results.module.css";
import { ActionButton, showToast } from "@ui";
import ResultCard from "@components/ResultCard";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function parseSurvey(search) {
  const params = new URLSearchParams(search);
  const dataStr = params.get("data");
  if (!dataStr) return { title: "q", questions: [], surveyObj: {} };
  let obj;
  try {
    obj = JSON.parse(dataStr);
  } catch {
    return { title: "q", questions: [], surveyObj: {} };
  }
  const title = obj.title || "q";
  const questions = [];
  if (obj.questions) {
    for (const [qKey, q] of Object.entries(obj.questions)) {
      const answers = [];
      if (q.options) {
        for (const [optKey, optLabel] of Object.entries(q.options)) {
          answers.push({ key: optKey, label: optLabel });
        }
      }
      questions.push({ key: qKey, text: q.title || "", description: q.description || "", answers });
    }
  }
  return { title, questions, surveyObj: obj };
}

export default function Results() {
  const { title, questions, surveyObj } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("view");
    return parseSurvey("?" + params.toString());
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

  const surveyUrl = (() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("view");
    return window.location.pathname + "?" + params.toString();
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
        {!loading && questions.map((q) => <ResultCard key={q.key} question={q} results={results} />)}
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
