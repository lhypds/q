import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { showToast, hideToast } from "@ui";
import styles from "./list.module.css";

function surveyToUrl(id) {
  return "/?q=" + id;
}

export default function SurveyList() {
  const { t } = useTranslation();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/surveys")
      .then((r) => r.json())
      .then((data) => {
        setSurveys(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) showToast(t("toast.loading"), null, "center");
    else hideToast();
  }, [loading, t]);

  if (loading) return null;

  return (
    <div className={styles.list}>
      {surveys.length > 0 ? (
        surveys.map((survey, i) => (
          <a key={i} href={surveyToUrl(survey.id)} className={styles.item}>
            <div className={styles.info}>
              <span className={styles.title}>{survey.survey.title || t("home.untitled")}</span>
              {survey.survey.subtitle && <span className={styles.subtitle}>[{survey.survey.subtitle}]</span>}
            </div>
            <span className={styles.count}>{t("home.response", { count: survey.count })}</span>
          </a>
        ))
      ) : (
        <div>{t("home.noSurveys")}</div>
      )}
    </div>
  );
}
