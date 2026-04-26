import { useState } from "react";
import { ActionButton, showToast } from "@ui";
import { CreateEdit } from "@components/CreateEdit";
import { SurveyList } from "./SurveyList";
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
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [createEditKey, setCreateEditKey] = useState(0);

  function handleCreateSave(newSurveyObj) {
    const url = new URL(window.location.href);
    url.search = "";
    for (const [k, v] of Object.entries(newSurveyObj)) {
      if (v !== null && v !== undefined && v !== "") {
        url.searchParams.set(k, v);
      }
    }
    window.location.href = url.toString();
  }

  async function handleShare() {
    const copied = await copyText(window.location.href);
    showToast(copied ? "Link copied to clipboard" : "Failed to copy link");
  }

  return (
    <div className="page">
      <div className={styles.titleRow}>
        <div className="page-title">q</div>
        <div className={styles.actions}>
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

      <CreateEdit
        key={createEditKey}
        isOpen={createEditOpen}
        onClose={() => setCreateEditOpen(false)}
        surveyObj={{}}
        onSave={handleCreateSave}
        mode="create"
      />

      <div className={styles.content}>
        <SurveyList />
      </div>
    </div>
  );
}
