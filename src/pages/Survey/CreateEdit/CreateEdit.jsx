import { useState } from "react";
import { Modal } from "../../../ui";
import styles from "./edit.module.css";

function toJson(obj) {
  return JSON.stringify(obj, null, 2);
}

export default function Edit({ isOpen, onClose, currentTitle, currentSubtitle, surveyObj, onSave, mode }) {
  const [title, setTitle] = useState(currentTitle || "");
  const [subtitle, setSubtitle] = useState(currentSubtitle || "");
  const [jsonText, setJsonText] = useState(() => toJson(surveyObj || {}));
  const [jsonError, setJsonError] = useState("");

  function handleTitleChange(e) {
    const val = e.target.value;
    setTitle(val);
    try {
      const obj = JSON.parse(jsonText);
      obj.title = val;
      setJsonText(toJson(obj));
      setJsonError("");
    } catch {
      console.error("Invalid JSON.");
    }
  }

  function handleSubtitleChange(e) {
    const val = e.target.value;
    setSubtitle(val);
    try {
      const obj = JSON.parse(jsonText);
      if (val) obj.subtitle = val;
      else delete obj.subtitle;
      setJsonText(toJson(obj));
      setJsonError("");
    } catch {
      console.error("Invalid JSON.");
    }
  }

  function handleJsonChange(e) {
    const val = e.target.value;
    setJsonText(val);
    try {
      const obj = JSON.parse(val);
      setTitle(obj.title || "");
      setSubtitle(obj.subtitle || "");
      setJsonError("");
    } catch {
      setJsonError("Invalid JSON");
    }
  }

  function handleSave() {
    try {
      const obj = JSON.parse(jsonText);
      // title/subtitle inputs take final precedence
      if (title.trim()) obj.title = title.trim();
      if (subtitle.trim()) obj.subtitle = subtitle.trim();
      else delete obj.subtitle;
      if (!obj.title || !obj.title.trim()) {
        setJsonError("Title is required");
        return;
      }
      onSave(obj);
      onClose();
    } catch {
      setJsonError("Invalid JSON — cannot save");
    }
  }

  function handleAddQuestion() {
    try {
      const obj = JSON.parse(jsonText);
      // Find next question number
      let n = 1;
      while (obj[`q${n}`] !== undefined) n++;
      obj[`q${n}`] = `Question ${n}`;
      obj[`q${n}a1`] = "Option 1";
      obj[`q${n}a2`] = "Option 2";
      setJsonText(toJson(obj));
      setJsonError("");
    } catch {
      setJsonError("Invalid JSON — fix it before adding a question");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === "create" ? "Create" : "Edit"}>
      <div className={styles.container}>
        <div className={styles.field}>
          <label className={styles.label}>Title</label>
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Subtitle</label>
          <input
            className={styles.input}
            type="text"
            value={subtitle}
            onChange={handleSubtitleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className={styles.jsonField}>
          <div className={styles.jsonFieldHeader}>
            <label className={styles.label}>q.json</label>
            <button type="button" className={styles.addQuestionBtn} onClick={handleAddQuestion} title="Add question">
              +q
            </button>
          </div>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={jsonText}
            onChange={handleJsonChange}
            spellCheck={false}
          />
        </div>
        {jsonError && <div className={styles.jsonError}>{jsonError}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.saveButton} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
