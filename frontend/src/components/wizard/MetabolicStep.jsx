import React from "react";
import { t } from "../../i18n";
import ReadAloudButton from "../ReadAloudButton";

export default function MetabolicStep({
  profile,
  calculatedBmi,
  showLabsExpander,
  setShowLabsExpander,
  updateSubField,
  lang,
}) {
  return (
    <div className="step-panel card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
        <div>
          <h3 className="section-title">{t("wizard.metabolic.title", lang)}</h3>
          <p className="section-subtitle">{t("wizard.metabolic.subtitle", lang)}</p>
        </div>
        <ReadAloudButton
          text={`${t("wizard.metabolic.title", lang)}. ${t("wizard.metabolic.subtitle", lang)}`}
          lang={lang}
        />
      </div>

      <div className="grid-2-inputs">
        <div className="form-field-group">
          <label htmlFor="input-height" className="field-label">
            {t("wizard.metabolic.height_label", lang)} <span className="req">*</span>
          </label>
          <input
            id="input-height"
            type="number"
            min="100"
            max="230"
            placeholder="e.g. 162"
            value={profile.metabolic?.height_cm || ""}
            onChange={(e) => updateSubField("metabolic", "height_cm", e.target.value)}
            className="field-input"
          />
        </div>

        <div className="form-field-group">
          <label htmlFor="input-weight" className="field-label">
            {t("wizard.metabolic.weight_label", lang)} <span className="req">*</span>
          </label>
          <input
            id="input-weight"
            type="number"
            min="25"
            max="250"
            placeholder="e.g. 62"
            value={profile.metabolic?.weight_kg || ""}
            onChange={(e) => updateSubField("metabolic", "weight_kg", e.target.value)}
            className="field-input"
          />
        </div>
      </div>

      {/* Computed BMI without shaming labels */}
      {calculatedBmi && (
        <div className="bmi-display-box" role="status">
          <span className="bmi-title">{t("wizard.metabolic.bmi_calculated", lang)}:</span>
          <strong className="bmi-number">{calculatedBmi} kg/m²</strong>
          <small className="bmi-footnote">{t("wizard.metabolic.bmi_note", lang)}</small>
        </div>
      )}

      {/* Waist */}
      <div className="form-field-group">
        <label htmlFor="input-waist" className="field-label">
          {t("wizard.metabolic.waist_label", lang)}
        </label>
        <input
          id="input-waist"
          type="number"
          min="40"
          max="200"
          placeholder="e.g. 78"
          value={profile.metabolic?.waist_cm || ""}
          onChange={(e) => updateSubField("metabolic", "waist_cm", e.target.value)}
          className="field-input"
        />
        <small className="field-help-text">{t("wizard.metabolic.waist_hint", lang)}</small>
      </div>

      {/* Checkboxes */}
      <div className="form-field-group">
        <label className="field-label">{t("wizard.metabolic.indicators_title", lang)}</label>
        <div className="checkbox-options-stack">
          <label className="custom-check-box">
            <input
              type="checkbox"
              checked={Boolean(profile.metabolic?.family_history_diabetes)}
              onChange={(e) => updateSubField("metabolic", "family_history_diabetes", e.target.checked)}
            />
            <span>{t("wizard.metabolic.family_diabetes", lang)}</span>
          </label>
          <label className="custom-check-box">
            <input
              type="checkbox"
              checked={Boolean(profile.metabolic?.rapid_weight_gain)}
              onChange={(e) => updateSubField("metabolic", "rapid_weight_gain", e.target.checked)}
            />
            <span>{t("wizard.metabolic.rapid_weight_gain", lang)}</span>
          </label>
          <label className="custom-check-box">
            <input
              type="checkbox"
              checked={Boolean(profile.metabolic?.skin_darkening)}
              onChange={(e) => updateSubField("metabolic", "skin_darkening", e.target.checked)}
            />
            <span>{t("wizard.metabolic.skin_darkening", lang)}</span>
          </label>
          <label className="custom-check-box">
            <input
              type="checkbox"
              checked={Boolean(profile.metabolic?.known_abnormal_glucose)}
              onChange={(e) => updateSubField("metabolic", "known_abnormal_glucose", e.target.checked)}
            />
            <span>{t("wizard.metabolic.known_glucose", lang)}</span>
          </label>
          <label className="custom-check-box">
            <input
              type="checkbox"
              checked={Boolean(profile.metabolic?.known_abnormal_lipids)}
              onChange={(e) => updateSubField("metabolic", "known_abnormal_lipids", e.target.checked)}
            />
            <span>{t("wizard.metabolic.known_lipids", lang)}</span>
          </label>
        </div>
      </div>

      {/* Optional Labs Expander */}
      <div className="labs-expander-wrapper">
        <button
          type="button"
          className="btn-toggle-labs"
          onClick={() => setShowLabsExpander(!showLabsExpander)}
          aria-expanded={showLabsExpander}
        >
          {t("wizard.metabolic.labs_expander_title", lang)} {showLabsExpander ? "▲" : "▼"}
        </button>

        {showLabsExpander && (
          <div className="labs-expanded-panel">
            <p className="labs-note">{t("wizard.metabolic.labs_hint", lang)}</p>
            <div className="grid-3-inputs">
              <div className="form-field-group">
                <label htmlFor="input-tsh" className="field-label">{t("wizard.metabolic.tsh", lang)}</label>
                <input
                  id="input-tsh"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 2.5"
                  value={profile.metabolic?.tsh || ""}
                  onChange={(e) => updateSubField("metabolic", "tsh", e.target.value)}
                  className="field-input"
                />
              </div>
              <div className="form-field-group">
                <label htmlFor="input-fsh" className="field-label">{t("wizard.metabolic.fsh", lang)}</label>
                <input
                  id="input-fsh"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 6.0"
                  value={profile.metabolic?.fsh || ""}
                  onChange={(e) => updateSubField("metabolic", "fsh", e.target.value)}
                  className="field-input"
                />
              </div>
              <div className="form-field-group">
                <label htmlFor="input-lh" className="field-label">{t("wizard.metabolic.lh", lang)}</label>
                <input
                  id="input-lh"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 6.0"
                  value={profile.metabolic?.lh || ""}
                  onChange={(e) => updateSubField("metabolic", "lh", e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div className="grid-2-inputs">
              <div className="form-field-group">
                <label htmlFor="input-follicle-l" className="field-label">{t("wizard.metabolic.follicle_left", lang)}</label>
                <input
                  id="input-follicle-l"
                  type="number"
                  placeholder="e.g. 14"
                  value={profile.metabolic?.["Follicle No. (L)"] || ""}
                  onChange={(e) => updateSubField("metabolic", "Follicle No. (L)", e.target.value)}
                  className="field-input"
                />
              </div>
              <div className="form-field-group">
                <label htmlFor="input-follicle-r" className="field-label">{t("wizard.metabolic.follicle_right", lang)}</label>
                <input
                  id="input-follicle-r"
                  type="number"
                  placeholder="e.g. 15"
                  value={profile.metabolic?.["Follicle No. (R)"] || ""}
                  onChange={(e) => updateSubField("metabolic", "Follicle No. (R)", e.target.value)}
                  className="field-input"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
