import { useState } from "react";
import { Modal } from "../../../ui";
import styles from "./edit.module.css";

export default function Edit({ isOpen, onClose, currentTitle, currentSubtitle, onSave }) {
  const [title, setTitle] = useState(currentTitle || "");
  const [subtitle, setSubtitle] = useState(currentSubtitle || "");

  function handleSave() {
    onSave(title.trim(), subtitle.trim());
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit">
      <div className={styles.container}>
        <div className={styles.field}>
          <label className={styles.label}>Title</label>
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            onChange={(e) => setSubtitle(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
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
