import React from "react";
import { t } from "../../i18n";

export default function ConcernStep({
  profile,
  derivedCtx,
  updateField,
  updateSubField,
  lang,
}) {
  return (
    <div className="step-panel card">
      <h3 className="section-title">{t("wizard.concern.title", lang)}</h3>
      <p className="section-subtitle">{t("wizard.concern.subtitle", lang)}</p>

      <div className="selectable-card-options" role="radiogroup" aria-labelledby="main-concern-label">
        {[
          "facial_hair",
          "acne",
          "hair_loss",
          "irregular_periods",
          "weight_metabolic",
          "fertility",
          "mood_stress",
          "energy_fatigue",
          "menopause_symptoms",
          "sleep",
        ]
          .filter((cKey) => {
            // Filter out non-applicable domains
            if (cKey === "irregular_periods" && derivedCtx.cycle_tracking === "not_applicable") {
              return false;
            }
            if (cKey === "fertility" && !derivedCtx.applicable_domains.includes("fertility")) {
              return false;
            }
            if (cKey === "menopause_symptoms" && !derivedCtx.applicable_domains.includes("menopause_bone_cv")) {
              return false;
            }
            return true;
          })
          .map((cKey) => {
            const label = t(`wizard.concern.concerns_list.${cKey}`, lang);
            const isSelected = profile.main_concern === cKey;
            return (
              <button
                key={cKey}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`card-select-btn large-tile ${isSelected ? "active" : ""}`}
                onClick={() => updateField("main_concern", cKey)}
              >
                <span className="dot-radio">{isSelected ? "●" : "○"}</span>
                <span className="btn-text"><strong>{label}</strong></span>
              </button>
            );
          })}
      </div>

      {/* Red Flag Clinical Safety Checklist */}
      <div className="red-flags-checklist-box">
        <h4>{t("wizard.concern.red_flags_title", lang)}</h4>
        <div className="checkbox-options-stack">
          <label className="custom-check-box flag-box">
            <input
              type="checkbox"
              checked={Boolean(profile.red_flags?.sudden_severe_pain)}
              onChange={(e) => updateSubField("red_flags", "sudden_severe_pain", e.target.checked)}
            />
            <span>{t("wizard.concern.flag_pain", lang)}</span>
          </label>

          <label className="custom-check-box flag-box">
            <input
              type="checkbox"
              checked={Boolean(profile.red_flags?.heavy_bleeding_soaking_through)}
              onChange={(e) => updateSubField("red_flags", "heavy_bleeding_soaking_through", e.target.checked)}
            />
            <span>{t("wizard.concern.flag_heavy", lang)}</span>
          </label>

          {derivedCtx.postmenopausal && (
            <label className="custom-check-box flag-box">
              <input
                type="checkbox"
                checked={Boolean(profile.red_flags?.vaginal_bleeding)}
                onChange={(e) => updateSubField("red_flags", "vaginal_bleeding", e.target.checked)}
              />
              <span>{t("wizard.concern.flag_postmeno_bleeding", lang)}</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
