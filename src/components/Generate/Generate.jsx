import { useState } from "react";
import { Modal } from "@ui";
import styles from "./generate.module.css";

export default function Generate({ isOpen, onClose, onComplete }) {
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState("input"); // "input" | "prompt"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setError("");
    if (stage === "input") {
      if (!topic.trim()) return;
      setLoading(true);
      try {
        const res = await fetch("/generate/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topic.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate prompt");
        setPrompt(data.prompt);
        setStage("prompt");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const res = await fetch("/generate/qjson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topic.trim(), prompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate survey");
        onComplete(data.survey);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate">
      <div className={styles.container}>
        {/* Input */}
        <textarea
          className={styles.inputTextarea}
          placeholder="What would you like to survey?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={loading}
          autoFocus
        />

        {/* Prompt */}
        <textarea
          className={`${styles.promptTextarea} ${stage === "input" ? styles.promptGrayed : ""}`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Your survey questions will appear here..."
          readOnly={stage === "input"}
        />

        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={styles.generateButton} onClick={handleGenerate} disabled={loading || !topic.trim()}>
            {"Generate"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
