import React from "react";
import { t } from "../i18n";

export default function Review({ profile, onEditSection, onSubmit, onBack, lang = "en", loading = false }) {
  return (
    <div className="review-page-container card" role="region" aria-label="Review Answers">
      <div className="review-header">
        <h3 className="section-title">{t("wizard.review.title", lang)}</h3>
        <p className="section-subtitle">{t("wizard.review.subtitle", lang)}</p>
      </div>

      <div className="review-sections-list">
        {/* Section 1: Context */}
        <div className="review-section-box">
          <div className="review-section-head">
            <h4>1. {t("wizard.review.section_context", lang)}</h4>
            <button
              type="button"
              className="btn-edit-section"
              onClick={() => onEditSection(1)}
              aria-label="Edit Anatomical Context"
            >
              {t("wizard.review.edit", lang)}
            </button>
          </div>
          <div className="review-data-grid">
            <div>
              <span className="data-key">{t("wizard.context.age_label", lang)}:</span>
              <strong>{profile.age || "—"}</strong>
            </div>
            <div>
              <span className="data-key">{t("wizard.context.uterus_label", lang)}:</span>
              <strong>{profile.context?.uterus || "—"}</strong>
            </div>
            {profile.context?.uterus === "no" && (
              <div>
                <span className="data-key">{t("wizard.context.ovaries_label", lang)}:</span>
                <strong>{profile.context?.ovaries || "—"}</strong>
              </div>
            )}
            <div>
              <span className="data-key">{t("wizard.context.menopause_label", lang)}:</span>
              <strong>{profile.context?.menopause_status || "—"}</strong>
            </div>
            <div>
              <span className="data-key">{t("wizard.context.reproductive_goal_label", lang)}:</span>
              <strong>{profile.reproductive_goal || "—"}</strong>
            </div>
          </div>
        </div>

        {/* Section 2 & 3: Symptoms & Impact */}
        <div className="review-section-box">
          <div className="review-section-head">
            <h4>2. {t("wizard.review.section_symptoms", lang)}</h4>
            <button
              type="button"
              className="btn-edit-section"
              onClick={() => onEditSection(2)}
              aria-label="Edit Symptoms and Impact"
            >
              {t("wizard.review.edit", lang)}
            </button>
          </div>
          <div className="review-data-grid">
            <div>
              <span className="data-key">{t("wizard.symptoms.facial_hair.title", lang)}:</span>
              <strong>{profile.symptoms?.facial_hair || "None"} (Impact: {profile.impact?.facial_hair || "None"})</strong>
            </div>
            <div>
              <span className="data-key">{t("wizard.symptoms.acne.title", lang)}:</span>
              <strong>{profile.symptoms?.acne || "None"} (Impact: {profile.impact?.acne || "None"})</strong>
            </div>
            <div>
              <span className="data-key">{t("wizard.symptoms.hair_loss.title", lang)}:</span>
              <strong>{profile.symptoms?.hair_loss || "None"} (Impact: {profile.impact?.hair_loss || "None"})</strong>
            </div>
            <div>
              <span className="data-key">{t("wizard.symptoms.menstrual.title", lang)}:</span>
              <strong>{profile.symptoms?.menstrual || "N/A"}</strong>
            </div>
          </div>
        </div>

        {/* Section 4: Metabolic */}
        <div className="review-section-box">
          <div className="review-section-head">
            <h4>3. {t("wizard.review.section_metabolic", lang)}</h4>
            <button
              type="button"
              className="btn-edit-section"
              onClick={() => onEditSection(4)}
              aria-label="Edit Metabolic Health"
            >
              {t("wizard.review.edit", lang)}
            </button>
          </div>
          <div className="review-data-grid">
            <div>
              <span className="data-key">Height / Weight:</span>
              <strong>{profile.metabolic?.height_cm} cm / {profile.metabolic?.weight_kg} kg</strong>
            </div>
            {profile.metabolic?.waist_cm && (
              <div>
                <span className="data-key">Waist:</span>
                <strong>{profile.metabolic?.waist_cm} cm</strong>
              </div>
            )}
            <div>
              <span className="data-key">Family Diabetes:</span>
              <strong>{profile.metabolic?.family_history_diabetes ? "Yes" : "No"}</strong>
            </div>
          </div>
        </div>

        {/* Section 5: Wellbeing */}
        <div className="review-section-box">
          <div className="review-section-head">
            <h4>4. {t("wizard.review.section_wellbeing", lang)}</h4>
            <button
              type="button"
              className="btn-edit-section"
              onClick={() => onEditSection(5)}
              aria-label="Edit Wellbeing and Sleep"
            >
              {t("wizard.review.edit", lang)}
            </button>
          </div>
          <div className="review-data-grid">
            <div>
              <span className="data-key">Sleep Problem Level:</span>
              <strong>{profile.wellbeing?.sleep_problem_0_4 ?? "Not answered"}</strong>
            </div>
            <div>
              <span className="data-key">PHQ-9 Score:</span>
              <strong>{profile.wellbeing?.phq9_total ? `${profile.wellbeing?.phq9_total} / 27` : "Skipped"}</strong>
            </div>
          </div>
        </div>

        {/* Section 6: Concern */}
        <div className="review-section-box">
          <div className="review-section-head">
            <h4>5. {t("wizard.review.section_concern", lang)}</h4>
            <button
              type="button"
              className="btn-edit-section"
              onClick={() => onEditSection(6)}
              aria-label="Edit Main Concern"
            >
              {t("wizard.review.edit", lang)}
            </button>
          </div>
          <div className="review-data-grid">
            <div>
              <span className="data-key">{t("wizard.concern.title", lang)}:</span>
              <strong>{profile.main_concern ? t(`wizard.concern.concerns_list.${profile.main_concern}`, lang) : "—"}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="review-actions-footer">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← {t("wizard.back", lang)}
        </button>
        <button
          type="button"
          className="btn-primary btn-submit-caremap"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "Synthesizing Care Pathway..." : t("wizard.submit_button", lang)}
        </button>
      </div>
    </div>
  );
}
