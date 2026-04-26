import styles from "./card.module.css";

export default function QuestionCard({ question, selected, onSelect }) {
  const isMulti = question.multi;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{question.text}</div>
        <span className="badge">{question.key}</span>
      </div>
      {question.description && <div className="card-desc">{question.description}</div>}
      <div className={styles.options}>
        {question.answers.map((a) => {
          const isChecked = isMulti
            ? Array.isArray(selected) && selected.includes(a.key)
            : selected === a.key;
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
      </div>
    </div>
  );
}
