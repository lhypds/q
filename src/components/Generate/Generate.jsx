import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal, showToast, hideToast, TextArea } from "@ui";
import styles from "./generate.module.css";
import { normalizeSurvey } from "@utils/surveyUtils";

export default function Generate({ isOpen, onClose, onComplete }) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState("input"); // "input" | "generated"
  const [currentTopic, setCurrentTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const promptRef = useRef(null);

  useEffect(() => {
    if (promptRef.current) {
      promptRef.current.scrollTop = promptRef.current.scrollHeight;
    }
  }, [prompt]);

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

    const dots = [".", "..", "..."];
    let dotIndex = 0;
    const base = t("toast.creating");
    showToast(base + dots[0], null, "center");
    const interval = setInterval(() => {
      dotIndex = (dotIndex + 1) % dots.length;
      showToast(base + dots[dotIndex], null, "center");
    }, 500);

    try {
      const res = await fetch("/generate/qjson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: currentTopic, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate survey");
      clearInterval(interval);
      hideToast();
      onComplete(normalizeSurvey(data.survey));
    } catch (e) {
      clearInterval(interval);
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
  const buttonLabel = !isGenerated ? t("button.generate") : hasModification ? t("button.rewrite") : t("button.complete");
  const buttonDisabled = loading || (!isGenerated && !inputValue.trim());

  return (
    <Modal isOpen={isOpen} onClose={loading ? undefined : onClose} title={t("generate.title")} className={styles.modal}>
      <div className={styles.container}>
        {/* Input */}
        <TextArea
          className={styles.inputTextarea}
          placeholder={isGenerated ? t("generate.placeholderModify") : t("generate.placeholderNew")}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
          autoFocus
          minHeight={80}
        />

        {/* Prompt */}
        <TextArea
          ref={promptRef}
          className={`${styles.promptTextarea}`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("generate.promptPlaceholder")}
          readOnly={!isGenerated || loading}
          minHeight={420}
        />

        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={loading}>
            {t("button.cancel")}
          </button>
          <button type="button" className={styles.generateButton} onClick={handleButtonClick} disabled={buttonDisabled}>
            {buttonLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
