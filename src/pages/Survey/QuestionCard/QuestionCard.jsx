import styles from "./card.module.css";
import { useTranslation } from "react-i18next";
import { TextArea } from "@ui";

function CardShell({ question, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{question.text}</div>
        <span className="badge">{question.key}</span>
      </div>
      {question.description && <div className="card-desc">{question.description}</div>}
      {children}
    </div>
  );
}

export default function QuestionCard({ question, selected, onSelect, otherValue, onOtherChange }) {
  const { t } = useTranslation();

  if (question.type === "multi") {
    const isOtherChecked = Array.isArray(selected) && selected.includes("__other__");
    return (
      <CardShell question={question}>
        <div className={styles.options}>
          {question.answers.map((a) => {
            const isChecked = Array.isArray(selected) && selected.includes(a.key);
            return (
              <label key={a.key} className={`${styles.optionLabel} ${isChecked ? styles.optionLabelSelected : ""}`}>
                <input type="checkbox" name={question.key} value={a.key} checked={isChecked} onChange={() => onSelect(a.key)} />
                <span className={styles.optionText}>{a.label}</span>
              </label>
            );
          })}

          {question.hasOtherOption && (
            <label className={`${styles.optionLabel} ${isOtherChecked ? styles.optionLabelSelected : ""}`}>
              <input
                type="checkbox"
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
      </CardShell>
    );
  }

  if (question.type === "text") {
    return (
      <CardShell question={question}>
        <div className={styles.options}>
          <TextArea className={styles.textArea} value={selected || ""} onChange={(e) => onSelect(e.target.value)} />
        </div>
      </CardShell>
    );
  }

  if (question.type === "true_false") {
    return (
      <CardShell question={question}>
        <div className={styles.options}>
          <label className={`${styles.optionLabel} ${selected === "true" ? styles.optionLabelSelected : ""}`}>
            <input
              type="checkbox"
              name={question.key}
              value="true"
              checked={selected === "true"}
              onChange={() => onSelect(selected === "true" ? "" : "true")}
            />
            <span className={styles.optionText}>{t("questionCard.yes")}</span>
          </label>
          <label className={`${styles.optionLabel} ${selected === "false" ? styles.optionLabelSelected : ""}`}>
            <input
              type="checkbox"
              name={question.key}
              value="false"
              checked={selected === "false"}
              onChange={() => onSelect(selected === "false" ? "" : "false")}
            />
            <span className={styles.optionText}>{t("questionCard.no")}</span>
          </label>
        </div>
      </CardShell>
    );
  }

  // Single
  const isOtherChecked = selected === "__other__";
  return (
    <CardShell question={question}>
      <div className={styles.options}>
        {question.answers.map((a) => {
          const isChecked = selected === a.key;
          return (
            <label key={a.key} className={`${styles.optionLabel} ${isChecked ? styles.optionLabelSelected : ""}`}>
              <input type="radio" name={question.key} value={a.key} checked={isChecked} onChange={() => onSelect(a.key)} />
              <span className={styles.optionText}>{a.label}</span>
            </label>
          );
        })}
        {question.hasOtherOption && (
          <label className={`${styles.optionLabel} ${isOtherChecked ? styles.optionLabelSelected : ""}`}>
            <input
              type="radio"
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
    </CardShell>
  );
}
