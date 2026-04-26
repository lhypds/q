import { useState, useEffect } from "react";
import styles from "./list.module.css";

function surveyToUrl(survey) {
  const params = new URLSearchParams(survey);
  return "/?" + params.toString();
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

  if (surveys.length === 0) {
    return <div>Noq.</div>;
  }

  return (
    <div className={styles.list}>
      {surveys.map((item, i) => (
        <a key={i} href={surveyToUrl(item.survey)} className={styles.item}>
          <span className={styles.title}>{item.survey.title || "Untitled"}</span>
          <span className={styles.count}>
            {item.count} {item.count === 1 ? "response" : "responses"}
          </span>
        </a>
      ))}
    </div>
  );
}
