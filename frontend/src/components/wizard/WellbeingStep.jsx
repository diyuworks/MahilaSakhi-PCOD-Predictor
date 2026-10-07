import React from "react";
import { t } from "../../i18n";

export const PHQ9_ITEMS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading or watching TV",
  "Moving or speaking noticeably slowly, or being unusually fidgety/restless",
  "Thoughts that you would be better off dead, or thoughts of hurting yourself in some way",
];

export const GAD7_ITEMS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or turn worrying off",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it's hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

export default function WellbeingStep({
  profile,
  telemanasAck,
  setTelemanasAck,
  updateSubField,
  lang,
}) {
  return (
    <div className="step-panel card">
      <h3 className="section-title">{t("wizard.wellbeing.title", lang)}</h3>
      <p className="section-subtitle">{t("wizard.wellbeing.subtitle", lang)}</p>

      {(profile.wellbeing?.phq9_item9 || 0) > 0 && (
        <div className="red-flag-banner urgency-today" role="alert" style={{ marginBottom: "1.5rem" }}>
          <div className="flag-content">
            <div className="flag-title-row">
              <span className="urgency-chip urgency-today">
                {t("wizard.wellbeing.safety_alert_title", lang)}
              </span>
            </div>
            <p className="flag-message" style={{ fontWeight: 600, marginTop: "0.5rem" }}>
              {t("wizard.wellbeing.safety_alert_msg", lang)}
            </p>
            <p style={{ marginTop: "0.5rem", fontWeight: 700 }}>
              Tele-MANAS at 14416 (Toll-Free, 24x7 India)
            </p>
            <label className="custom-check-box" style={{ marginTop: "0.75rem", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={Boolean(telemanasAck)}
                onChange={(e) => setTelemanasAck(e.target.checked)}
              />
              <span style={{ marginLeft: "0.5rem" }}>{t("wizard.wellbeing.safety_alert_ack", lang)}</span>
            </label>
          </div>
        </div>
      )}

      {/* Sleep Quality */}
      <div className="form-field-group" role="radiogroup" aria-labelledby="sleep-q-label">
        <label id="sleep-q-label" className="field-label">{t("wizard.wellbeing.sleep_title", lang)}</label>
        <div className="selectable-card-options">
          {[0, 1, 2, 3, 4].map((sVal) => (
            <button
              key={sVal}
              type="button"
              role="radio"
              aria-checked={profile.wellbeing?.sleep_problem_0_4 === sVal}
              className={`card-select-btn ${profile.wellbeing?.sleep_problem_0_4 === sVal ? "active" : ""}`}
              onClick={() => updateSubField("wellbeing", "sleep_problem_0_4", sVal)}
            >
              <span className="dot-radio">{profile.wellbeing?.sleep_problem_0_4 === sVal ? "●" : "○"}</span>
              <span className="btn-text">{t(`wizard.wellbeing.sleep_options.${sVal}`, lang)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Optional Mental Scales Toggle */}
      <div className="form-field-group">
        <label className="custom-check-box">
          <input
            type="checkbox"
            checked={Boolean(profile.wellbeing?.include_mental_scales)}
            onChange={(e) => updateSubField("wellbeing", "include_mental_scales", e.target.checked)}
          />
          <span>{t("wizard.wellbeing.optional_mental_toggle", lang)}</span>
        </label>
      </div>

      {profile.wellbeing?.include_mental_scales && (
        <div className="mental-health-instruments-block">
          {/* PHQ-9 */}
          <div className="instrument-card">
            <h4 className="instrument-heading">PHQ-9 Mood Assessment (9 items)</h4>
            <p className="instrument-sub">{t("wizard.wellbeing.phq_intro", lang)}</p>

            {PHQ9_ITEMS.map((qText, qIdx) => {
              const currentVal = profile.wellbeing?.phq_answers?.[qIdx] ?? null;
              const isItem9 = qIdx === 8;
              return (
                <div key={qIdx} className={`survey-row ${isItem9 && currentVal > 0 ? "safety-flagged" : ""}`}>
                  <p className="survey-q-title">{qIdx + 1}. {qText}</p>
                  <div className="survey-chips-row" role="radiogroup" aria-label={`PHQ-9 question ${qIdx + 1}`}>
                    {[0, 1, 2, 3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        role="radio"
                        aria-checked={currentVal === val}
                        className={`scale-chip-btn ${currentVal === val ? "active" : ""}`}
                        onClick={() => {
                          const copy = [...(profile.wellbeing?.phq_answers || Array(9).fill(null))];
                          copy[qIdx] = val;
                          updateSubField("wellbeing", "phq_answers", copy);
                          const answered = copy.filter((x) => x !== null);
                          const total = answered.length > 0 ? answered.reduce((a, b) => a + b, 0) : null;
                          updateSubField("wellbeing", "phq9_total", total);
                          updateSubField("wellbeing", "phq9_item9", copy[8]);
                        }}
                      >
                        {t(`wizard.wellbeing.phq_scale_${val}`, lang)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* GAD-7 */}
          <div className="instrument-card">
            <h4 className="instrument-heading">GAD-7 Anxiety Assessment (7 items)</h4>
            <p className="instrument-sub">{t("wizard.wellbeing.phq_intro", lang)}</p>

            {GAD7_ITEMS.map((qText, qIdx) => {
              const currentVal = profile.wellbeing?.gad_answers?.[qIdx] ?? null;
              return (
                <div key={qIdx} className="survey-row">
                  <p className="survey-q-title">{qIdx + 1}. {qText}</p>
                  <div className="survey-chips-row" role="radiogroup" aria-label={`GAD-7 question ${qIdx + 1}`}>
                    {[0, 1, 2, 3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        role="radio"
                        aria-checked={currentVal === val}
                        className={`scale-chip-btn ${currentVal === val ? "active" : ""}`}
                        onClick={() => {
                          const copy = [...(profile.wellbeing?.gad_answers || Array(7).fill(null))];
                          copy[qIdx] = val;
                          updateSubField("wellbeing", "gad_answers", copy);
                          const answered = copy.filter((x) => x !== null);
                          const total = answered.length > 0 ? answered.reduce((a, b) => a + b, 0) : null;
                          updateSubField("wellbeing", "gad7_total", total);
                        }}
                      >
                        {t(`wizard.wellbeing.phq_scale_${val}`, lang)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
