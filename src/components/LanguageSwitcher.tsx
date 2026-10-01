import { useEffect, useState } from "react";
import { getLanguage, setLanguage, type LanguageCode } from "../i18n";

export default function LanguageSwitcher() {
  const [language, setCurrentLanguage] = useState<LanguageCode>("ar");

  useEffect(() => {
    setCurrentLanguage(getLanguage());
  }, []);

  function changeLanguage(next: LanguageCode) {
    setLanguage(next);
    setCurrentLanguage(next);
    window.location.reload();
  }

  return (
    <div className="language-switcher" role="group" aria-label="Language">
      <button
        type="button"
        className={language === "ar" ? "active" : ""}
        onClick={() => changeLanguage("ar")}
      >
        العربية
      </button>
      <button
        type="button"
        className={language === "fr" ? "active" : ""}
        onClick={() => changeLanguage("fr")}
      >
        Français
      </button>
    </div>
  );
}
