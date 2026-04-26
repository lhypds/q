import { useState, useMemo } from "react";
import styles from "./survey.module.css";
import { ActionButton, showToast, Modal } from "@ui";
import { CreateEdit } from "@components/CreateEdit";
import QuestionCard from "@components/QuestionCard";
import { normalizeSurvey } from "@utils/surveyUtils";
import { parseSurvey } from "@utils/urlUtils";
import { copyText } from "@utils/clipboardUitls";

export default function Survey() {
  const { title, subtitle, description, questions, surveyObj } = useMemo(() => parseSurvey(window.location.search), []);

  const [selections, setSelections] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [createEditKey, setCreateEditKey] = useState(0);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const allAnswered = questions.every((q) => selections[q.key]);

  function handleEditSave(newSurveyObj) {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("q", JSON.stringify(newSurveyObj));
    window.location.href = url.toString();
  }

  async function handleShare() {
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    url.searchParams.delete("view");
    const copied = await copyText(decodeURIComponent(url.toString()));
    showToast(copied ? "Link copied to clipboard" : "Failed to copy link");
  }

  async function doSubmit(emailValue) {
    try {
      // Normalize the survey object
      const normalizedSurvey = normalizeSurvey(surveyObj);

      const res = await fetch("/surveyresult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey: normalizedSurvey, result: selections, email: emailValue }),
      });
      if (!res.ok) throw new Error("Server error");
      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit. Please try again. " + err.message);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!allAnswered) {
      setError("Please answer all questions before submitting.");
      return;
    }
    setError("");
    setEmailModalOpen(true);
  }

  function handleEmailConfirm() {
    setEmailModalOpen(false);
    doSubmit(email.trim());
  }

  const isEdit = new URLSearchParams(window.location.search).get("edit") === "true";

  const resultsUrl = window.location.pathname + window.location.search + (window.location.search ? "&" : "?") + "view=results";

  if (submitted) {
    return (
      <div className="page">
        <div className={`card ${styles.thankYouCard}`}>
          <div className="card-title">Thank you!</div>
          <div className={styles.thankYouText}>Your response has been recorded.</div>
          <a href={resultsUrl} className="results-link">
            View Results →
          </a>
        </div>
      </div>
    );
  }

  const surveyUrl = (() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("view");
    return window.location.pathname + "?" + params.toString();
  })();

  return (
    <div className="page">
      {/* Title */}
      <div className={styles.titleRow}>
        <a href={surveyUrl} className={`page-title ${styles.titleLink}`}>
          {title || "q"}
        </a>

        <div className={styles.actions}>
          {isEdit && (
            <ActionButton
              tooltip="Edit"
              onClick={() => {
                setCreateEditKey((k) => k + 1);
                setCreateEditOpen(true);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 21l3.75-.75L19 8l-3-3L3.75 17.25 3 21z" />
                <path d="M14 6l3 3" />
              </svg>
            </ActionButton>
          )}

          <ActionButton tooltip="Share" onClick={handleShare}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98" />
              <path d="M15.41 6.51L8.59 10.49" />
            </svg>
          </ActionButton>
        </div>
      </div>

      {subtitle && <div className={styles.subtitle}>[{subtitle}]</div>}
      {description && <div className={styles.description}>{description}</div>}

      <Modal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          doSubmit("");
        }}
        title="Submit"
      >
        <div className={styles.emailModal}>
          <p className={styles.emailHint}>Enter your email to receive a copy of your response (optional).</p>
          <input
            className={styles.emailInput}
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEmailConfirm();
              if (e.key === "Escape") {
                setEmailModalOpen(false);
                doSubmit("");
              }
            }}
            autoFocus
          />
          <div className={styles.emailActions}>
            <button
              className={styles.emailSkip}
              type="button"
              onClick={() => {
                setEmailModalOpen(false);
                doSubmit("");
              }}
            >
              Skip
            </button>
            <button className={styles.emailConfirm} type="button" onClick={handleEmailConfirm}>
              Submit
            </button>
          </div>
        </div>
      </Modal>

      <CreateEdit
        key={createEditKey}
        isOpen={createEditOpen}
        onClose={() => setCreateEditOpen(false)}
        currentTitle={title}
        currentSubtitle={subtitle}
        currentDescription={description}
        surveyObj={surveyObj}
        onSave={handleEditSave}
        mode="edit"
      />

      <div className={styles.content}>
        <form onSubmit={handleSubmit}>
          <div className={styles.questions}>
            {questions.map((q) => (
              <QuestionCard
                key={q.key}
                question={q}
                selected={selections[q.key]}
                onSelect={(val) => setSelections((prev) => ({ ...prev, [q.key]: val }))}
              />
            ))}
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="submit-row">
            <div className={styles.submitRowLeft}>
              <button type="submit" className={styles.submitBtn} disabled={!allAnswered}>
                Submit
              </button>
              <a href={resultsUrl} className="results-link small">
                View Results →
              </a>
            </div>
            <a href={"/"} className="results-link small">
              q
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
