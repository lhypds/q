import styles from "./card.module.css";
import { useTranslation } from "react-i18next";

export default function QuestionCard({ question, selected, onSelect, otherValue, onOtherChange }) {
  const { t } = useTranslation();
  const isMulti = question.type === "multi";
  const isOtherChecked = isMulti ? Array.isArray(selected) && selected.includes("__other__") : selected === "__other__";

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{question.text}</div>
        <span className="badge">{question.key}</span>
      </div>
      {question.description && <div className="card-desc">{question.description}</div>}
      <div className={styles.options}>
        {question.answers.map((a) => {
          const isChecked = isMulti ? Array.isArray(selected) && selected.includes(a.key) : selected === a.key;
          return (
            <label key={a.key} className={`${styles.optionLabel} ${isChecked ? styles.optionLabelSelected : ""}`}>
              <input
                type={isMulti ? "checkbox" : "radio"}
                name={question.key}
                value={a.key}
                checked={isChecked}
                onChange={() => onSelect(a.key)}
              />
              <span className={styles.optionText}>{a.label}</span>
            </label>
          );
        })}
        {question.hasOtherOption && (
          <label className={`${styles.optionLabel} ${isOtherChecked ? styles.optionLabelSelected : ""}`}>
            <input
              type={isMulti ? "checkbox" : "radio"}
              name={question.key}
              value="__other__"
              checked={isOtherChecked}
              onChange={() => onSelect("__other__")}
            />
            <div className={styles.optionText}>{t("questionCard.otherOption")}:</div>
            <input
              type="text"
              className={styles.otherInput}
              value={otherValue || ""}
              disabled={!isOtherChecked}
              onChange={(e) => onOtherChange(e.target.value)}
              onClick={() => {
                if (!isOtherChecked) onSelect("__other__");
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
