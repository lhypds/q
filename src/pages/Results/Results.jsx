import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import styles from "./results.module.css";
import { ActionButton, showToast } from "@ui";
import ResultCard from "@components/ResultCard";
import LanguageSwitcher from "@components/LanguageSwitcher/LanguageSwitcher";
import { parseSurvey } from "@utils/urlUtils";
import { copyText } from "@utils/clipboardUitls";

export default function Results() {
  const { t } = useTranslation();
  const { title, subtitle, description, questions, surveyObj } = useMemo(() => {
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
        else setFetchError(data.error || t("results.fetchError"));
        setLoading(false);
      })
      .catch(() => {
        setFetchError(t("results.fetchError"));
        setLoading(false);
      });
  }, [surveyKey]);

  const surveyUrl = (() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("view");
    return window.location.pathname + "?" + params.toString();
  })();

  async function handleShare() {
    const copied = await copyText(decodeURIComponent(window.location.href));
    showToast(copied ? t("toast.linkCopied") : t("toast.failedCopy"));
  }

  return (
    <div className="page">
      <div className={styles.titleRow}>
        <a href={surveyUrl} className={`page-title ${styles.titleLink}`}>
          {title}
        </a>

        <div className={styles.actions}>
          <LanguageSwitcher />
          <ActionButton tooltip={t("button.share")} onClick={handleShare}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98" />
              <path d="M15.41 6.51L8.59 10.49" />
            </svg>
          </ActionButton>
        </div>
      </div>

      <div className={styles.subtitle}>{subtitle}</div>
      <div className={styles.description}>{description}</div>

      {fetchError && <p className="error-msg">{fetchError}</p>}

      <div className={styles.content}>
        {!loading && questions.map((q) => <ResultCard key={q.key} question={q} results={results} />)}
      </div>

      <div className="submit-row">
        <div className={styles.collectionInfo}>
          {loading ? t("results.loading") : t("results.collected", { count: results.length })}
        </div>
        <a href={"/"} className="results-link small">
          q
        </a>
      </div>
    </div>
  );
}
