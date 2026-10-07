import React from "react";
import { t } from "../i18n";

export default function RedFlagBanner({
  flags = [],
  overallUrgency = "monitor",
  lang = "en",
  showTelemanas = false,
  telemanasAcknowledged = false,
  onAcknowledgeTelemanas = () => {},
}) {
  const urgencyLabel = {
    today: lang === "hi" ? "तत्काल परामर्श आवश्यक (आज ही)" : "Urgent Evaluation Needed (Today)",
    this_week: lang === "hi" ? "इस सप्ताह डॉक्टर से मिलें" : "Medical Evaluation Recommended (This Week)",
    "4_6_weeks": lang === "hi" ? "अगले 4-6 सप्ताह में चर्चा करें" : "Discuss in 4-6 Weeks",
    monitor: lang === "hi" ? "लक्षणों पर नज़र रखें" : "Monitor Symptoms",
  }[overallUrgency] || overallUrgency;

  return (
    <div className="red-flags-container">
      {/* Tele-MANAS Emergency Alert */}
      {showTelemanas && (
        <div className="telemanas-emergency-banner" role="alert" aria-live="assertive">
          <div className="emergency-icon" aria-hidden="true">!</div>
          <div className="emergency-content">
            <h4>{t("wizard.wellbeing.safety_alert_title", lang)}</h4>
            <p>{t("wizard.wellbeing.safety_alert_msg", lang)}</p>
            {!telemanasAcknowledged && (
              <button
                type="button"
                className="btn-emergency-ack"
                onClick={onAcknowledgeTelemanas}
              >
                {t("wizard.wellbeing.safety_alert_ack", lang)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Clinical Flags Alert */}
      {flags && flags.length > 0 && (
        <div
          className={`urgency-alert-banner urgency-${overallUrgency}`}
          role="alert"
          aria-live="polite"
        >
          <div className="alert-icon" aria-hidden="true">!</div>
          <div className="alert-body">
            <div className="urgency-label-pill">{urgencyLabel}</div>
            <ul className="flags-list">
              {flags.map((flag, idx) => (
                <li key={idx} className="flag-item">
                  {flag.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
