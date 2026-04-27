import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionButton, showToast } from "@ui";
import { CreateEdit } from "@components/CreateEdit";
import { Generate } from "@components/Generate";
import { SurveyList } from "./SurveyList";
import LanguageSwitcher from "@components/LanguageSwitcher/LanguageSwitcher";
import styles from "./home.module.css";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function Home() {
  const { t } = useTranslation();
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [createEditKey, setCreateEditKey] = useState(0);
  const [createEditSurveyObj, setCreateEditSurveyObj] = useState({ title: "", subtitle: "", description: "" });

  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateKey, setGenerateKey] = useState(0);

  async function handleCreateSave(newSurveyObj) {
    const res = await fetch("/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ survey: newSurveyObj }),
    });
    const data = await res.json();
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("q", data.id);
    url.searchParams.set("edit", "true");
    window.location.href = url.toString();
  }

  async function handleGenerateComplete(generatedSurveyObj) {
    setGenerateOpen(false);
    const res = await fetch("/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ survey: generatedSurveyObj }),
    });
    const data = await res.json();
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("q", data.id);
    url.searchParams.set("edit", "true");
    window.location.href = url.toString();
  }

  async function handleShare() {
    const url = decodeURIComponent(window.location.href);
    const text = `${t("toast.shareMessage")}\n\n👉 ${url}`;
    const copied = await copyText(text);
    showToast(copied ? t("toast.linkCopied") : t("toast.failedCopy"));
  }

  const surveyUrl = (() => {
    return window.location.pathname;
  })();

  return (
    <div className="page">
      <div className={styles.titleRow}>
        <a href={surveyUrl} className={`page-title ${styles.titleLink}`}>
          q
        </a>

        <div className={styles.actions}>
          <ActionButton
            tooltip={t("button.generate")}
            onClick={() => {
              setGenerateKey((k) => k + 1);
              setGenerateOpen(true);
            }}
          >
            {/* Brain icon SVG */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 3a3 3 0 0 0-3 3v1.5A2.5 2.5 0 0 0 3 10v4a2.5 2.5 0 0 0 3 2.5V18a3 3 0 0 0 3 3" />
              <path d="M15 3a3 3 0 0 1 3 3v1.5A2.5 2.5 0 0 1 21 10v4a2.5 2.5 0 0 1-3 2.5V18a3 3 0 0 1-3 3" />
              <path d="M9 3h6" />
              <path d="M9 21h6" />
              <path d="M12 7v10" />
            </svg>
          </ActionButton>

          <ActionButton
            tooltip={t("button.create")}
            onClick={() => {
              setCreateEditSurveyObj({ title: "", subtitle: "", description: "" });
              setCreateEditKey((k) => k + 1);
              setCreateEditOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 21l3.75-.75L19 8l-3-3L3.75 17.25 3 21z" />
              <path d="M14 6l3 3" />
            </svg>
          </ActionButton>

          <ActionButton tooltip={t("button.share")} onClick={handleShare}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98" />
              <path d="M15.41 6.51L8.59 10.49" />
            </svg>
          </ActionButton>

          <LanguageSwitcher />
        </div>
      </div>

      <CreateEdit
        key={createEditKey}
        isOpen={createEditOpen}
        onClose={() => setCreateEditOpen(false)}
        surveyObj={createEditSurveyObj}
        onSave={handleCreateSave}
        mode="create"
      />

      <Generate
        key={generateKey}
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onComplete={handleGenerateComplete}
      />

      <div className={styles.content}>
        <SurveyList />
      </div>
    </div>
  );
}
