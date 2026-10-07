import React from "react";

export default function LanguageToggle({ currentLang, onToggle }) {
  return (
    <div className="language-toggle-wrapper" role="group" aria-label="Language selection">
      <button
        type="button"
        className={`lang-btn ${currentLang === "en" ? "active" : ""}`}
        onClick={() => onToggle("en")}
        aria-pressed={currentLang === "en"}
      >
        English
      </button>
      <button
        type="button"
        className={`lang-btn ${currentLang === "hi" ? "active" : ""}`}
        onClick={() => onToggle("hi")}
        aria-pressed={currentLang === "hi"}
      >
        हिन्दी
      </button>
      <button
        type="button"
        className={`lang-btn ${currentLang === "gu" ? "active" : ""}`}
        onClick={() => onToggle("gu")}
        aria-pressed={currentLang === "gu"}
      >
        ગુજરાતી
      </button>
    </div>
  );
}
