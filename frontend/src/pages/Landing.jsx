import React, { useState } from "react";
import { t } from "../i18n";

export default function Landing({ lang, onLanguageChange, onStart }) {
  const [consented, setConsented] = useState(false);

  return (
    <div className="landing-page-container">
      {/* Hero Card */}
      <main className="landing-hero-card card">
        <div className="privacy-top-pill">
          <span>🛡️ {t("privacy_badge", lang)}</span>
        </div>

        <h2 className="hero-headline">{t("landing.promise", lang)}</h2>
        <p className="hero-subtext">{t("landing.sub_promise", lang)}</p>

        <div className="landing-transparency-grid">
          <div className="transparency-card collect-card">
            <span className="card-emoji" aria-hidden="true">📋</span>
            <div>
              <strong>{lang === "hi" ? "हम क्या पूछते हैं" : "What We Ask About"}</strong>
              <p>{t("landing.what_we_collect", lang)}</p>
            </div>
          </div>

          <div className="transparency-card never-card">
            <span className="card-emoji" aria-hidden="true">🔒</span>
            <div>
              <strong>{lang === "hi" ? "हम क्या कभी नहीं करते" : "Our Safety Guarantee"}</strong>
              <p>{t("landing.what_we_never_do", lang)}</p>
            </div>
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="consent-action-box">
          <label className="checkbox-consent-label">
            <input
              type="checkbox"
              id="landing-consent-checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="consent-check-input"
            />
            <span className="consent-check-text">{t("landing.consent_checkbox", lang)}</span>
          </label>

          <button
            type="button"
            className="btn-start-assessment"
            disabled={!consented}
            onClick={onStart}
            aria-disabled={!consented}
          >
            🌸 {t("landing.start_button", lang)} →
          </button>
        </div>

        <div className="landing-security-footer-note">
          <small>ℹ️ {t("data_not_saved_notice", lang)}</small>
        </div>
      </main>
    </div>
  );
}
