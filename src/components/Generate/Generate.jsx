import { useState } from "react";
import { Modal, showToast, hideToast } from "@ui";
import styles from "./generate.module.css";

export default function Generate({ isOpen, onClose, onComplete }) {
  const [inputValue, setInputValue] = useState("");
  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState("input"); // "input" | "generated"
  const [currentTopic, setCurrentTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generatePrompt(topic, modification, currentPrompt) {
    setLoading(true);
    setPrompt("");
    setError("");
    try {
      const res = await fetch("/generate/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, ...(modification ? { modification, currentPrompt } : {}) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate prompt");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setPrompt((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    const topic = inputValue.trim();
    if (!topic) return;
    setCurrentTopic(topic);
    await generatePrompt(topic);
    setStage("generated");
    setInputValue("");
  }

  async function handleRewrite() {
    const modification = inputValue.trim();
    if (!modification) return;
    await generatePrompt(currentTopic, modification, prompt);
    setInputValue("");
  }

  async function handleComplete() {
    setLoading(true);
    setError("");
    showToast("Creating...", null, "center");
    try {
      const res = await fetch("/generate/qjson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: currentTopic, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate survey");
      hideToast();
      onComplete(data.survey);
    } catch (e) {
      hideToast();
      setError(e.message);
      setLoading(false);
    }
  }

  function handleButtonClick() {
    if (stage === "generated" && !inputValue.trim()) {
      handleComplete();
    } else if (stage === "generated") {
      handleRewrite();
    } else {
      handleGenerate();
    }
  }

  const isGenerated = stage === "generated";
  const hasModification = isGenerated && inputValue.trim().length > 0;
  const buttonLabel = !isGenerated ? "Generate" : hasModification ? "Rewrite" : "Complete";
  const buttonDisabled = loading || (!isGenerated && !inputValue.trim());

  return (
    <Modal isOpen={isOpen} onClose={loading ? undefined : onClose} title="Generate">
      <div className={styles.container}>
        {/* Input */}
        <textarea
          className={styles.inputTextarea}
          placeholder={isGenerated ? "How you want to modify the survey?" : "What would you like to survey?"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
          autoFocus
        />

        {/* Prompt */}
        <textarea
          className={`${styles.promptTextarea} ${!isGenerated || loading ? styles.promptGrayed : ""}`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Your survey questions will appear here..."
          readOnly={!isGenerated || loading}
        />

        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={styles.generateButton} onClick={handleButtonClick} disabled={buttonDisabled}>
            {buttonLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
