import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "./survey.module.css";
import { ActionButton, showToast, Modal } from "@ui";
import { CreateEdit } from "@components/CreateEdit";
import QuestionCard from "@components/QuestionCard";
import LanguageSwitcher from "@components/LanguageSwitcher/LanguageSwitcher";
import { normalizeSurvey } from "@utils/surveyUtils";
import { parseSurvey, parseSurveyObj } from "@utils/urlUtils";
import { copyText } from "@utils/clipboardUitls";

const qParam = new URLSearchParams(window.location.search).get("q");
const isNumericId = qParam !== null && /^\d+$/.test(qParam);

export default function Survey() {
  const { t } = useTranslation();
  const [surveyData, setSurveyData] = useState(() =>
    isNumericId
      ? { title: null, subtitle: "", description: "", questions: [], surveyObj: {} }
      : parseSurvey(window.location.search),
  );

  useEffect(() => {
    if (!isNumericId) return;
    fetch(`/survey?id=${qParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.survey) {
          setSurveyData(parseSurveyObj(data.survey));
          const params = new URLSearchParams(window.location.search);
          params.set("q", JSON.stringify(data.survey));
          window.history.replaceState(null, "", "?" + params.toString());
        }
      });
  }, []);

  const { title, subtitle, description, questions, surveyObj } = surveyData;

  const [selections, setSelections] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [createEditKey, setCreateEditKey] = useState(0);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const allAnswered = questions.every((q) => selections[q.key]);

  function handleEditSave(newSurveyObj) {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("q", JSON.stringify(newSurveyObj));
    url.searchParams.set("edit", "true");
    window.location.href = url.toString();
  }

  async function handleDelete() {
    await fetch("/survey", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ survey: surveyObj }),
    });
    window.location.href = "/";
  }

  async function handleShare() {
    let id = isNumericId ? qParam : null;
    if (!id) {
      const res = await fetch("/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey: surveyObj }),
      });
      const data = await res.json();
      id = data.id;
    }
    const shareUrl = `${window.location.origin}/?q=${id}`;
    const text = t("survey.shareText", { title, subtitle, shareUrl });
    const copied = await copyText(text);
    showToast(copied ? t("toast.linkCopied") : t("toast.failedCopy"));
  }

  async function doSubmit(emailValue) {
    try {
      const normalizedSurvey = normalizeSurvey(surveyObj);

      const res = await fetch("/surveyresult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey: normalizedSurvey, result: selections, email: emailValue }),
      });
      if (!res.ok) throw new Error("Server error");
      setSubmitted(true);
    } catch (err) {
      setError(t("survey.submitFailed") + " " + err.message);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!allAnswered) {
      setError(t("survey.answerAll"));
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
          <div className="card-title">{t("survey.thankYou")}</div>
          <div className={styles.thankYouText}>{t("survey.responseRecorded")}</div>
          <a href={resultsUrl} className="results-link">
            {t("button.viewResults")}
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
          <LanguageSwitcher />

          {isEdit && (
            <ActionButton
              tooltip={t("button.edit")}
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

          <ActionButton tooltip={t("button.share")} onClick={handleShare}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98" />
              <path d="M15.41 6.51L8.59 10.49" />
            </svg>
          </ActionButton>

          {isEdit && (
            <ActionButton tooltip={t("button.delete")} onClick={() => setDeleteModalOpen(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </ActionButton>
          )}
        </div>
      </div>

      {subtitle && <div className={styles.subtitle}>[{subtitle}]</div>}
      {description && <div className={styles.description}>{description}</div>}

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title={t("survey.deleteTitle")}>
        <div className={styles.emailModal}>
          <p className={styles.emailHint}>{t("survey.deleteConfirm")}</p>
          <div className={styles.emailActions}>
            <button className={styles.emailSkip} type="button" onClick={() => setDeleteModalOpen(false)}>
              {t("button.cancel")}
            </button>
            <button className={styles.emailConfirm} type="button" onClick={handleDelete}>
              {t("button.delete")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          doSubmit("");
        }}
        title={t("survey.submitTitle")}
      >
        <div className={styles.emailModal}>
          <p className={styles.emailHint}>{t("survey.emailHint")}</p>
          <input
            className={styles.emailInput}
            type="email"
            placeholder={t("survey.emailPlaceholder")}
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
              {t("button.skip")}
            </button>
            <button className={styles.emailConfirm} type="button" onClick={handleEmailConfirm}>
              {t("button.submit")}
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
                {t("button.submit")}
              </button>
              <a href={resultsUrl} className="results-link small">
                {t("button.viewResults")}
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
