import React from "react";
import { t } from "../../i18n";
import SeverityPicker from "../SeverityPicker";

export default function SymptomsStep({
  profile,
  derivedCtx,
  updateField,
  updateSubField,
  lang,
}) {
  return (
    <div className="step-panel card">
      <h3 className="section-title">{t("wizard.symptoms.title", lang)}</h3>
      <p className="section-subtitle">{t("wizard.symptoms.subtitle", lang)}</p>

      {/* Facial Hair */}
      <SeverityPicker
        groupName="facial-hair"
        title={t("wizard.symptoms.facial_hair.title", lang)}
        desc={t("wizard.symptoms.facial_hair.desc", lang)}
        value={profile.symptoms?.facial_hair}
        onChange={(val) => updateSubField("symptoms", "facial_hair", val)}
        options={[
          { key: "none", title: t("wizard.symptoms.facial_hair.none", lang), desc: t("wizard.symptoms.facial_hair.none_desc", lang) },
          { key: "mild", title: t("wizard.symptoms.facial_hair.mild", lang), desc: t("wizard.symptoms.facial_hair.mild_desc", lang) },
          { key: "moderate", title: t("wizard.symptoms.facial_hair.moderate", lang), desc: t("wizard.symptoms.facial_hair.moderate_desc", lang) },
          { key: "severe", title: t("wizard.symptoms.facial_hair.severe", lang), desc: t("wizard.symptoms.facial_hair.severe_desc", lang) },
          { key: "rapidly_worsening", title: t("wizard.symptoms.facial_hair.rapidly_worsening", lang), desc: t("wizard.symptoms.facial_hair.rapidly_worsening_desc", lang) },
        ]}
      />

      {/* Acne */}
      <SeverityPicker
        groupName="acne"
        title={t("wizard.symptoms.acne.title", lang)}
        desc={t("wizard.symptoms.acne.desc", lang)}
        value={profile.symptoms?.acne}
        onChange={(val) => updateSubField("symptoms", "acne", val)}
        options={[
          { key: "none", title: t("wizard.symptoms.acne.none", lang), desc: t("wizard.symptoms.acne.none_desc", lang) },
          { key: "occasional", title: t("wizard.symptoms.acne.occasional", lang), desc: t("wizard.symptoms.acne.occasional_desc", lang) },
          { key: "persistent", title: t("wizard.symptoms.acne.persistent", lang), desc: t("wizard.symptoms.acne.persistent_desc", lang) },
          { key: "severe", title: t("wizard.symptoms.acne.severe", lang), desc: t("wizard.symptoms.acne.severe_desc", lang) },
          { key: "scarring", title: t("wizard.symptoms.acne.scarring", lang), desc: t("wizard.symptoms.acne.scarring_desc", lang) },
        ]}
      />

      {/* Hair Loss */}
      <SeverityPicker
        groupName="hair-loss"
        title={t("wizard.symptoms.hair_loss.title", lang)}
        desc={t("wizard.symptoms.hair_loss.desc", lang)}
        value={profile.symptoms?.hair_loss}
        onChange={(val) => updateSubField("symptoms", "hair_loss", val)}
        options={[
          { key: "none", title: t("wizard.symptoms.hair_loss.none", lang), desc: t("wizard.symptoms.hair_loss.none_desc", lang) },
          { key: "mild", title: t("wizard.symptoms.hair_loss.mild", lang), desc: t("wizard.symptoms.hair_loss.mild_desc", lang) },
          { key: "moderate", title: t("wizard.symptoms.hair_loss.moderate", lang), desc: t("wizard.symptoms.hair_loss.moderate_desc", lang) },
          { key: "severe", title: t("wizard.symptoms.hair_loss.severe", lang), desc: t("wizard.symptoms.hair_loss.severe_desc", lang) },
          { key: "progressive", title: t("wizard.symptoms.hair_loss.progressive", lang), desc: t("wizard.symptoms.hair_loss.progressive_desc", lang) },
        ]}
      />

      {/* Menstrual Question (Conditional) */}
      {derivedCtx.cycle_tracking === "not_applicable" ? (
        <div className="context-banner subtle-info" role="note">
          {t("wizard.symptoms.menstrual.hidden_notice", lang)}
        </div>
      ) : (
        <>
          {derivedCtx.cycle_tracking === "unreliable_on_hormones" && (
            <div className="context-banner subtle-warning" role="note">
              {t("wizard.symptoms.menstrual.hormone_note", lang)}
            </div>
          )}
          <SeverityPicker
            groupName="menstrual"
            title={t("wizard.symptoms.menstrual.title", lang)}
            desc={t("wizard.symptoms.menstrual.desc", lang)}
            value={profile.symptoms?.menstrual}
            onChange={(val) => updateSubField("symptoms", "menstrual", val)}
            options={[
              { key: "regular", title: t("wizard.symptoms.menstrual.regular", lang), desc: t("wizard.symptoms.menstrual.regular_desc", lang) },
              { key: "occasionally_irregular", title: t("wizard.symptoms.menstrual.occasionally_irregular", lang), desc: t("wizard.symptoms.menstrual.occasionally_irregular_desc", lang) },
              { key: "frequently_irregular", title: t("wizard.symptoms.menstrual.frequently_irregular", lang), desc: t("wizard.symptoms.menstrual.frequently_irregular_desc", lang) },
              { key: "very_infrequent", title: t("wizard.symptoms.menstrual.very_infrequent", lang), desc: t("wizard.symptoms.menstrual.very_infrequent_desc", lang) },
              { key: "no_periods", title: t("wizard.symptoms.menstrual.no_periods", lang), desc: t("wizard.symptoms.menstrual.no_periods_desc", lang) },
            ]}
          />

          {profile.symptoms?.menstrual === "no_periods" && (
            <div className="form-field-group branching-subfield">
              <label htmlFor="input-amenorrhea" className="field-label">
                {t("wizard.symptoms.menstrual.months_amenorrhea", lang)}
              </label>
              <input
                id="input-amenorrhea"
                type="number"
                min="0"
                placeholder="e.g. 4"
                value={profile.months_since_last_period || ""}
                onChange={(e) => updateField("months_since_last_period", e.target.value)}
                className="field-input"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
