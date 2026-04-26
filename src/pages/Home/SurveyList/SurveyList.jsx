import { useState, useEffect } from "react";
import styles from "./list.module.css";

function surveyToUrl(survey) {
  return "/?q=" + encodeURIComponent(JSON.stringify(survey));
}

export default function SurveyList() {
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

  if (loading) return null;

  return (
    <div className={styles.list}>
      {surveys.length > 0 ? (
        surveys.map((item, i) => (
          <a key={i} href={surveyToUrl(item.survey)} className={styles.item}>
            <div className={styles.info}>
              <span className={styles.title}>{item.survey.title || "Untitled"}</span>
              {item.survey.subtitle && <span className={styles.subtitle}>[{item.survey.subtitle}]</span>}
            </div>
            <span className={styles.count}>
              {item.count} {item.count === 1 ? "response" : "responses"}
            </span>
          </a>
        ))
      ) : (
        <div>Noq.</div>
      )}
    </div>
  );
}
