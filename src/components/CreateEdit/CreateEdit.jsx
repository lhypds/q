import { useState } from "react";
import { Modal } from "@ui";
import { normalizeSurvey } from "@utils/surveyUtils";
import styles from "./edit.module.css";

function toJson(obj) {
  return JSON.stringify(obj, null, 2);
}

export default function CreateEdit({
  isOpen,
  onClose,
  currentTitle,
  currentSubtitle,
  currentDescription,
  surveyObj,
  onSave,
  mode,
}) {
  // Normalize surveyObj if it exists
  const normalizedSurveyObj = surveyObj ? normalizeSurvey(surveyObj) : {};

  const [title, setTitle] = useState(currentTitle || normalizedSurveyObj.title || "");
  const [subtitle, setSubtitle] = useState(currentSubtitle || normalizedSurveyObj.subtitle || "");
  const [description, setDescription] = useState(currentDescription || normalizedSurveyObj.description || "");

  const [jsonText, setJsonText] = useState(() => toJson(normalizedSurveyObj));
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

  function handleDescriptionChange(e) {
    const val = e.target.value;
    setDescription(val);
    try {
      const obj = JSON.parse(jsonText);
      if (val) obj.description = val;
      else delete obj.description;
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
      setDescription(obj.description || "");
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
      if (description.trim()) obj.description = description.trim();
      else delete obj.description;
      if (!obj.title || !obj.title.trim()) {
        setJsonError("Title is required");
        return;
      }
      if (!obj.questions || Object.keys(obj.questions).length === 0) {
        setJsonError("At least one question is required");
        return;
      }
      onSave(normalizeSurvey(obj));
      onClose();
    } catch {
      setJsonError("Invalid JSON — cannot save");
    }
  }

  function handleAddQuestion() {
    try {
      const obj = JSON.parse(jsonText);
      if (!obj.questions) obj.questions = {};
      const nums = Object.keys(obj.questions)
        .map(Number)
        .filter((n) => !isNaN(n));
      const n = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      obj.questions[String(n)] = {
        title: `Question ${n} title`,
        description: "Description for this question...",
        options: { 1: "Option 1", 2: "Option 2" },
      };
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
        {/* Title */}
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

        {/* Subtitle */}
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

        {/* Description */}
        <div className={styles.descriptionField}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.descriptionTextarea}
            value={description}
            onChange={handleDescriptionChange}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* q.json */}
        <div className={styles.qjsonField}>
          <div className={styles.qjsonFieldLabelRow}>
            <label className={styles.label}>q.json</label>
            <button type="button" className={styles.addQuestionBtn} onClick={handleAddQuestion} title="Add question">
              +q
            </button>
          </div>
          <textarea
            className={styles.qjsonTextarea}
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
            {mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
