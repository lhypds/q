import styles from "./card.module.css";

export default function QuestionCard({ question, selected, onSelect }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{question.text}</div>
        <span className="badge">{question.key}</span>
      </div>
      <div className={styles.options}>
        {question.answers.map((a) => (
          <label key={a.key} className={`${styles.optionLabel} ${selected === a.key ? styles.optionLabelSelected : ""}`}>
            <input type="radio" name={question.key} value={a.key} checked={selected === a.key} onChange={() => onSelect(a.key)} />
            <span className={styles.optionText}>{a.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
