import { useState, useMemo } from "react";
import styles from "./survey.module.css";
import { ActionButton, showToast, Modal } from "@ui";
import { CreateEdit } from "./CreateEdit";
import { SurveyList } from "./SurveyList";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function parseSurvey(search) {
  const params = new URLSearchParams(search);
  const title = params.get("title");
  const subtitle = params.get("subtitle") || "";
  const surveyObj = {};
  for (const [k, v] of params.entries()) {
    surveyObj[k] = v;
  }
  const questions = [];
  let i = 1;
  while (params.has(`q${i}`)) {
    const qText = params.get(`q${i}`);
    const answers = [];
    let j = 1;
    while (params.has(`q${i}a${j}`)) {
      answers.push({ key: `q${i}a${j}`, label: params.get(`q${i}a${j}`) });
      j++;
    }
    questions.push({ key: `q${i}`, text: qText, answers });
    i++;
  }
  return { title, subtitle, questions, surveyObj };
}

export default function Survey() {
  const { title, subtitle, questions, surveyObj } = useMemo(() => parseSurvey(window.location.search), []);
  const isHome = !title && questions.length === 0;

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
    // Clear existing search params and rebuild from newSurveyObj
    url.search = "";
    for (const [k, v] of Object.entries(newSurveyObj)) {
      if (v !== null && v !== undefined && v !== "") {
        url.searchParams.set(k, v);
      }
    }
    window.location.href = url.toString();
  }

  async function handleShare() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    params.delete("view");
    url.search = params.toString();
    const copied = await copyText(url.toString());
    showToast(copied ? "Link copied to clipboard" : "Failed to copy link");
  }

  async function doSubmit(emailValue) {
    try {
      const res = await fetch("/surveyresult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey: surveyObj, result: selections, email: emailValue }),
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

  const resultsUrl = window.location.pathname + window.location.search + (window.location.search ? "&" : "?") + "view=results";

  if (submitted) {
    return (
      <div className="page">
        <div className={`card ${styles.thankYouCard}`}>
          <div className="card-title">Thank you!</div>
          <p className={styles.thankYouText}>Your response has been recorded.</p>
          <a href={resultsUrl} className="results-link">
            View Results →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Title */}
      <div className={styles.titleRow}>
        <div className="page-title">{title || "q"}</div>

        <div className={styles.actions}>
          {isHome && (
            <ActionButton
              tooltip="Create"
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
          {!isHome && (
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

      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}

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
        surveyObj={surveyObj}
        onSave={handleEditSave}
      />

      <div className={styles.content}>
        {/* Survey Form */}
        {!isHome && (
          <form onSubmit={handleSubmit}>
            <div className={styles.questions}>
              {questions.map((q) => (
                <div key={q.key} className="card">
                  <div className="card-header">
                    <div className="card-title">{q.text}</div>
                    <span className="badge">{q.key}</span>
                  </div>
                  <div className="card-desc">Select one option below.</div>
                  <div className={styles.options}>
                    {q.answers.map((a) => (
                      <label
                        key={a.key}
                        className={`${styles.optionLabel} ${selections[q.key] === a.key ? styles.optionLabelSelected : ""}`}
                      >
                        <input
                          type="radio"
                          name={q.key}
                          value={a.key}
                          checked={selections[q.key] === a.key}
                          onChange={() => setSelections((prev) => ({ ...prev, [q.key]: a.key }))}
                        />
                        <span className={styles.optionText}>{a.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
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
        )}

        {isHome && (
          <div>
            <SurveyList />
          </div>
        )}
      </div>
    </div>
  );
}
