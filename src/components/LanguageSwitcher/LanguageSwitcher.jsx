import { useTranslation } from "react-i18next";
import styles from "./lang.module.css";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "zh", label: "ZH" },
  { code: "ja", label: "JA" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = LANGS.find((l) => l.code === i18n.language) || LANGS[0];

  function switchLang(code) {
    i18n.changeLanguage(code);
    localStorage.setItem("lang", code);
  }

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.trigger}>
        {current.label}
      </button>
      <div className={styles.dropdown}>
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            className={`${styles.option} ${i18n.language === code ? styles.active : ""}`}
            onClick={() => switchLang(code)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
