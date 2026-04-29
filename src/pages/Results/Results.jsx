import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "./results.module.css";
import { ActionButton, showToast } from "@ui";
import { LanguageSwitcher } from "@components";
import { parseSurveyObj } from "@utils/urlUtils";
import { copyText } from "@utils/clipboardUitls";
import { ScaleResults } from "./ScaleResults";
import { ResultCard } from "./ResultCard";
import { AnalysisCard } from "./AnalysisCard";

const qParam = new URLSearchParams(window.location.search).get("q");
const rParam = new URLSearchParams(window.location.search).get("r");

export default function Results() {
  const { t } = useTranslation();

  const [surveyData, setSurveyData] = useState({
    title: null,
    subtitle: "",
    description: "",
    type: "common",
    questions: [],
    surveyObj: {},
  });
  const [scoring, setScoring] = useState(null);

  const [records, setRecords] = useState([]);
  const [singleRecord, setSingleRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    fetch(`/survey?id=${qParam}`)
      .then((r) => r.json())
      .then((data) => {
        const surveyData_ = parseSurveyObj(data.survey);
        if (data.survey) setSurveyData(surveyData_);
        if (data.scoring) setScoring(data.scoring);

        const survey = surveyData_.surveyObj;

        if (survey.type !== "common" && rParam) {
          // Single record
          fetch(`/record?id=${rParam}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.error) {
                setFetchError(data.error);
              } else if (String(data.survey_id) !== String(qParam)) {
                setFetchError(t("results.fetchError"));
              } else {
                setSingleRecord(data);
              }
              setLoading(false);
            })
            .catch(() => {
              setFetchError(t("results.fetchError"));
              setLoading(false);
            });
        } else {
          // Common survey records
          fetch(`/records?survey_id=${qParam}`)
            .then((r) => r.json())
            .then((data) => {
              if (Array.isArray(data)) setRecords(data);
              else setFetchError(data.error || t("results.fetchError"));
              setLoading(false);
            })
            .catch(() => {
              setFetchError(t("results.fetchError"));
              setLoading(false);
            });
        }
      });
  }, [t]);

  const { title, subtitle, description, questions } = surveyData;

  const surveyUrl = (() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("view");
    return window.location.pathname + "?" + params.toString();
  })();

  async function handleShare() {
    let id = qParam;
    const shareUrl = `${window.location.origin}/?q=${id}`;
    const text = t("survey.shareText", { title, subtitle: subtitle ? `[${subtitle}]\n` : "", shareUrl });
    const copied = await copyText(text);
    showToast(copied ? t("toast.linkCopied") : t("toast.failedCopy"));
  }

  if (loading) {
    return <div className="page">{t("common.loading")}</div>;
  }

  return (
    <div className="page">
      <div className={styles.titleRow}>
        <a href={surveyUrl} className={`page-title ${styles.titleLink}`}>
          {title}
        </a>

        <div className={styles.actions}>
          <ActionButton tooltip={t("button.share")} onClick={handleShare}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98" />
              <path d="M15.41 6.51L8.59 10.49" />
            </svg>
          </ActionButton>

          <LanguageSwitcher />
        </div>
      </div>

      {subtitle && <div className={styles.subtitle}>[{subtitle}]</div>}
      {description && <div className={styles.description}>{description}</div>}

      {fetchError && <p className="error-msg">{fetchError}</p>}

      {surveyData.type === "common" && (
        <div className={styles.collectionInfo}>{t("results.collected", { count: records.length }) + t("common.colon")}</div>
      )}

      <div className={styles.content}>
        {/* 1. Common */}
        {surveyData.type === "common" && questions.map((q) => <ResultCard key={q.key} question={q} results={records} />)}

        {/* 2. Assessment scale */}
        {surveyData.type === "assessment_scale" &&
          (singleRecord ? (
            <ScaleResults record={singleRecord} scoring={scoring} surveyId={qParam} recordId={rParam} />
          ) : (
            <div>{t("results.noRecord")}</div>
          ))}

        {/* 3. AI analysis */}
        {surveyData.type === "ai_analysis" &&
          (singleRecord ? <AnalysisCard surveyId={qParam} recordId={rParam} /> : <div>{t("results.noRecord")}</div>)}
      </div>

      <div className="submit-row">
        <a href={surveyUrl} className="results-link">
          {t("button.viewSurvey")}
        </a>
        <a href={"/"} className="results-link small">
          q
        </a>
      </div>
    </div>
  );
}
