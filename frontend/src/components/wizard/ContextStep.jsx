import React from "react";
import { t } from "../../i18n";
import ContextBanner from "../ContextBanner";
import ReadAloudButton from "../ReadAloudButton";

export default function ContextStep({
  profile,
  derivedCtx,
  updateField,
  updateSubField,
  lang,
}) {
  return (
    <div className="step-panel card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
        <div>
          <h3 className="section-title">{t("wizard.context.title", lang)}</h3>
          <p className="section-subtitle">{t("wizard.context.subtitle", lang)}</p>
        </div>
        <ReadAloudButton
          text={`${t("wizard.context.title", lang)}. ${t("wizard.context.subtitle", lang)}`}
          lang={lang}
        />
      </div>

      <ContextBanner notes={derivedCtx.notes} />

      {/* Age */}
      <div className="form-field-group">
        <label htmlFor="input-age" className="field-label">
          {t("wizard.context.age_label", lang)} <span className="req">*</span>
        </label>
        <input
          id="input-age"
          type="number"
          min="10"
          max="100"
          placeholder="e.g. 26"
          value={profile.age || ""}
          onChange={(e) => updateField("age", e.target.value)}
          className="field-input"
        />
      </div>

      {/* Uterus Question */}
      <div className="form-field-group" role="radiogroup" aria-labelledby="uterus-q-label">
        <label id="uterus-q-label" className="field-label">
          {t("wizard.context.uterus_label", lang)} <span className="req">*</span>
        </label>
        <div className="selectable-card-options">
          {[
            ["yes", t("wizard.context.uterus_yes", lang)],
            ["no", t("wizard.context.uterus_no", lang)],
            ["unsure", t("wizard.not_sure", lang)],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={profile.context?.uterus === key}
              className={`card-select-btn ${profile.context?.uterus === key ? "active" : ""}`}
              onClick={() => updateSubField("context", "uterus", key)}
            >
              <span className="dot-radio">{profile.context?.uterus === key ? "●" : "○"}</span>
              <span className="btn-text">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Branching: If Uterus is No, ask Ovaries */}
      {profile.context?.uterus === "no" && (
        <div className="form-field-group branching-subfield" role="radiogroup" aria-labelledby="ovaries-q-label">
          <label id="ovaries-q-label" className="field-label">
            {t("wizard.context.ovaries_label", lang)} <span className="req">*</span>
          </label>
          <div className="selectable-card-options">
            {[
              ["both", t("wizard.context.ovaries_both", lang)],
              ["one", t("wizard.context.ovaries_one", lang)],
              ["neither", t("wizard.context.ovaries_neither", lang)],
              ["unsure", t("wizard.not_sure", lang)],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={profile.context?.ovaries === key}
                className={`card-select-btn ${profile.context?.ovaries === key ? "active" : ""}`}
                onClick={() => updateSubField("context", "ovaries", key)}
              >
                <span className="dot-radio">{profile.context?.ovaries === key ? "●" : "○"}</span>
                <span className="btn-text">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menopause Status - Special Exception */}
      <div className="form-field-group">
        <label htmlFor="select-menopause" className="field-label">
          {t("wizard.context.menopause_label", lang)}{" "}
          {Number(profile.age) >= 45 ? (
            <span className="req">*</span>
          ) : (
            <span className="field-help-text" style={{ fontWeight: "normal", color: "#6b7280" }}>
              {lang === "hi" ? "(केवल अपवाद / 45+ वर्ष या सर्जरी)" : "(Special Case / Exception for 45+ or surgery)"}
            </span>
          )}
        </label>
        {Number(profile.age) < 45 && (
          <small className="field-help-text" style={{ display: "block", marginBottom: "0.5rem", color: "#6b7280" }}>
            {lang === "hi"
              ? "PCOD मुख्य रूप से सामान्य प्रजनन उम्र (15-45 वर्ष) में होता है। यदि आप सामान्य उम्र में हैं और पीरियड्स उम्र की वजह से बंद नहीं हुए हैं, तो इसे खाली छोड़ दें।"
              : "PCOS primarily affects women in reproductive years (15–45). If you are under 45 and periods have not stopped due to age, you can leave this as default."}
          </small>
        )}
        <select
          id="select-menopause"
          value={profile.context?.menopause_status || ""}
          onChange={(e) => updateSubField("context", "menopause_status", e.target.value)}
          className="field-select"
        >
          <option value="">
            {lang === "hi"
              ? "-- सामान्य प्रजनन उम्र / लागू नहीं (डिफ़ॉल्ट PCOS) --"
              : "-- Regular reproductive years / Not in menopause (Default) --"}
          </option>
          <option value="none">{t("wizard.context.meno_none", lang)}</option>
          <option value="perimenopause">{t("wizard.context.meno_peri", lang)}</option>
          <option value="natural">{t("wizard.context.meno_natural", lang)}</option>
          <option value="surgical">{t("wizard.context.meno_surgical", lang)}</option>
          <option value="unknown">{t("wizard.not_sure", lang)}</option>
        </select>
      </div>

      {(profile.context?.menopause_status === "natural" || profile.context?.menopause_status === "surgical") && (
        <div className="form-field-group">
          <label htmlFor="input-meno-age" className="field-label">
            {t("wizard.context.meno_age_label", lang)}
          </label>
          <input
            id="input-meno-age"
            type="number"
            min="20"
            max="80"
            placeholder="e.g. 50"
            value={profile.context?.age_at_menopause || ""}
            onChange={(e) => updateSubField("context", "age_at_menopause", e.target.value)}
            className="field-input"
          />
        </div>
      )}

      {/* Hormonal Medication */}
      <div className="form-field-group">
        <label className="field-label">{t("wizard.context.hormones_label", lang)}</label>
        <div className="checkbox-options-stack">
          <label className="custom-check-box">
            <input
              type="checkbox"
              checked={Boolean(profile.context?.on_hormonal_contraception)}
              onChange={(e) => updateSubField("context", "on_hormonal_contraception", e.target.checked)}
            />
            <span>{t("wizard.context.contraception", lang)}</span>
          </label>
          <label className="custom-check-box">
            <input
              type="checkbox"
              checked={Boolean(profile.context?.on_hrt)}
              onChange={(e) => updateSubField("context", "on_hrt", e.target.checked)}
            />
            <span>{t("wizard.context.hrt", lang)}</span>
          </label>
          <label className="custom-check-box">
            <input
              type="checkbox"
              checked={Boolean(profile.context?.pregnant_or_postpartum)}
              onChange={(e) => updateSubField("context", "pregnant_or_postpartum", e.target.checked)}
            />
            <span>{t("wizard.context.pregnancy_postpartum", lang)}</span>
          </label>
        </div>
      </div>

      {/* Reproductive Goal */}
      <div className="form-field-group" role="radiogroup" aria-labelledby="goal-q-label">
        <label id="goal-q-label" className="field-label">
          {t("wizard.context.reproductive_goal_label", lang)}
        </label>
        <div className="selectable-card-options">
          {[
            ["not_interested", t("wizard.context.goal_not_interested", lang)],
            ["later", t("wizard.context.goal_later", lang)],
            ["trying", t("wizard.context.goal_trying", lang)],
            ["fertility_concerns", t("wizard.context.goal_concerns", lang)],
            ["prefer_not_to_say", t("wizard.prefer_not_to_say", lang)],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={profile.reproductive_goal === key}
              className={`card-select-btn ${profile.reproductive_goal === key ? "active" : ""}`}
              onClick={() => updateField("reproductive_goal", key)}
            >
              <span className="dot-radio">{profile.reproductive_goal === key ? "●" : "○"}</span>
              <span className="btn-text">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
