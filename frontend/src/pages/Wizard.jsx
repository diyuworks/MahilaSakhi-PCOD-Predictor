import React, { useState, useMemo } from "react";
import { t } from "../i18n";
import { deriveContext } from "../contextHelper";
import ContextBanner from "../components/ContextBanner";
import SeverityPicker from "../components/SeverityPicker";
import ImpactChips from "../components/ImpactChips";
import RedFlagBanner from "../components/RedFlagBanner";

const PHQ9_ITEMS = [
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

const GAD7_ITEMS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it's hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

export default function Wizard({
  profile,
  onProfileChange,
  onCompleteToReview,
  onCancelToLanding,
  lang = "en",
  jumpToStep = 1,
}) {
  const [currentStep, setCurrentStep] = useState(jumpToStep);
  const [telemanasAck, setTelemanasAck] = useState(false);
  const [showLabsExpander, setShowLabsExpander] = useState(false);
  const [validationError, setValidationError] = useState(null);

  // Derive dynamic context
  const derivedCtx = useMemo(() => {
    return deriveContext({
      uterus: profile.context?.uterus,
      ovaries: profile.context?.ovaries,
      menopause_status: profile.context?.menopause_status,
      age: Number(profile.age) || 0,
      reproductive_goal: profile.reproductive_goal,
      on_hormonal_contraception: profile.context?.on_hormonal_contraception,
      on_hrt: profile.context?.on_hrt,
    });
  }, [profile]);

  // Derived BMI
  const calculatedBmi = useMemo(() => {
    const h = Number(profile.metabolic?.height_cm);
    const w = Number(profile.metabolic?.weight_kg);
    if (h > 50 && w > 20) {
      const hm = h / 100;
      return parseFloat((w / (hm * hm)).toFixed(1));
    }
    return null;
  }, [profile.metabolic]);

  // Helper update functions
  const updateField = (field, val) => {
    setValidationError(null);
    onProfileChange({ ...profile, [field]: val });
  };

  const updateSubField = (parent, field, val) => {
    setValidationError(null);
    onProfileChange({
      ...profile,
      [parent]: {
        ...(profile[parent] || {}),
        [field]: val,
      },
    });
  };

  // PHQ-9 item 9 safety trigger
  const phqItem9 = profile.wellbeing?.phq_answers?.[8] || 0;
  const showTelemanasAlert = phqItem9 > 0;

  // Validation before proceeding
  const validateStep = () => {
    if (currentStep === 1) {
      if (!profile.age) {
        setValidationError(lang === "hi" ? "कृपया अपनी आयु दर्ज करें।" : "Please enter your age.");
        return false;
      }
      if (!profile.context?.uterus) {
        setValidationError(
          lang === "hi" ? "कृपया गर्भाशय की स्थिति का चयन करें।" : "Please select your uterus status."
        );
        return false;
      }
      if (profile.context?.uterus === "no" && !profile.context?.ovaries) {
        setValidationError(
          lang === "hi" ? "कृपया अंडाशय की स्थिति का चयन करें।" : "Please select your ovary status."
        );
        return false;
      }
      if (!profile.context?.menopause_status) {
        setValidationError(
          lang === "hi" ? "कृपया मेनोपॉज की स्थिति चुनें।" : "Please select your menopause status."
        );
        return false;
      }
    } else if (currentStep === 2) {
      // Symptoms
      if (!profile.symptoms?.facial_hair) {
        setValidationError(lang === "hi" ? "कृपया चेहरे/शरीर के बालों का स्तर चुनें।" : "Please choose a level for facial/body hair.");
        return false;
      }
      if (!profile.symptoms?.acne) {
        setValidationError(lang === "hi" ? "कृपया मुंहासों का स्तर चुनें।" : "Please choose an option for acne.");
        return false;
      }
      if (!profile.symptoms?.hair_loss) {
        setValidationError(lang === "hi" ? "कृपया बालों के झड़ने का स्तर चुनें।" : "Please choose an option for scalp hair.");
        return false;
      }
      if (derivedCtx.cycle_tracking !== "not_applicable" && !profile.symptoms?.menstrual) {
        setValidationError(lang === "hi" ? "कृपया मासिक चक्र का स्तर चुनें।" : "Please choose your menstrual cycle pattern.");
        return false;
      }
    } else if (currentStep === 4) {
      // Metabolic
      if (!profile.metabolic?.height_cm || !profile.metabolic?.weight_kg) {
        setValidationError(lang === "hi" ? "कृपया कद और वजन दर्ज करें।" : "Please enter your height and weight.");
        return false;
      }
    } else if (currentStep === 5) {
      // Wellbeing safety check
      if ((profile.wellbeing?.phq9_item9 || 0) > 0 && !telemanasAck) {
        setValidationError(
          lang === "hi"
            ? "कृपया आगे बढ़ने से पहले आपातकालीन सहायता सूचना स्वीकार करें।"
            : "Please acknowledge the emergency support notice before proceeding."
        );
        return false;
      }
    } else if (currentStep === 6) {
      // Main concern
      if (!profile.main_concern) {
        setValidationError(lang === "hi" ? "कृपया अपनी मुख्य चिंता चुनें।" : "Please select your main health concern.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Complete wizard and go to Review
      onCompleteToReview();
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onCancelToLanding();
    }
  };

  // Step names
  const stepTitles = [
    t("wizard.steps.context", lang),
    t("wizard.steps.symptoms", lang),
    t("wizard.symptoms.title", lang),
    t("wizard.steps.metabolic", lang),
    t("wizard.steps.wellbeing", lang),
    t("wizard.steps.concern", lang),
  ];

  return (
    <div className="wizard-page-layout">
      {/* Sticky Progress Header */}
      <header className="wizard-stepper-header card">
        <div className="stepper-top-row">
          <span className="step-count-badge">
            {t("wizard.step_of", lang, { current: currentStep, total: 6 })}
          </span>
          <h2 className="step-name-heading">{stepTitles[currentStep - 1]}</h2>
        </div>
        <div className="stepper-track-bar" role="progressbar" aria-valuenow={currentStep} aria-valuemin="1" aria-valuemax="6">
          <div className="stepper-fill-bar" style={{ width: `${(currentStep / 6) * 100}%` }} />
        </div>
      </header>

      {/* Persistent Tele-MANAS banner if PHQ9 item 9 > 0 */}
      <RedFlagBanner
        showTelemanas={showTelemanasAlert}
        telemanasAcknowledged={telemanasAck}
        onAcknowledgeTelemanas={() => setTelemanasAck(true)}
        lang={lang}
      />

      {/* Validation Error banner */}
      {validationError && (
        <div className="validation-error-toast" role="alert">
          <span>⚠️ {validationError}</span>
        </div>
      )}

      {/* STEP 1: Context Gate */}
      {currentStep === 1 && (
        <div className="step-panel card">
          <h3 className="section-title">{t("wizard.context.title", lang)}</h3>
          <p className="section-subtitle">{t("wizard.context.subtitle", lang)}</p>

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
                📌 {t("wizard.context.ovaries_label", lang)} <span className="req">*</span>
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

          {/* Menopause Status */}
          <div className="form-field-group">
            <label htmlFor="select-menopause" className="field-label">
              {t("wizard.context.menopause_label", lang)} <span className="req">*</span>
            </label>
            <select
              id="select-menopause"
              value={profile.context?.menopause_status || ""}
              onChange={(e) => updateSubField("context", "menopause_status", e.target.value)}
              className="field-select"
            >
              <option value="" disabled>-- {lang === "hi" ? "चुनें" : "Select your status"} --</option>
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
      )}

      {/* STEP 2: Symptoms */}
      {currentStep === 2 && (
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
              ℹ️ {t("wizard.symptoms.menstrual.hidden_notice", lang)}
            </div>
          ) : (
            <>
              {derivedCtx.cycle_tracking === "unreliable_on_hormones" && (
                <div className="context-banner subtle-warning" role="note">
                  ⚠️ {t("wizard.symptoms.menstrual.hormone_note", lang)}
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
      )}

      {/* STEP 3: Impact */}
      {currentStep === 3 && (
        <div className="step-panel card">
          <h3 className="section-title">{lang === "hi" ? "दैनिक जीवन और आत्मविश्वास पर प्रभाव" : "Daily Life & Confidence Impact"}</h3>
          <p className="section-subtitle">
            {lang === "hi"
              ? "प्रत्येक लक्षण आपकी दिनचर्या, ऊर्जा या आत्मविश्वास को कितना प्रभावित करता है?"
              : "How significantly does each of your reported symptoms affect your daily life?"}
          </p>

          <div className="impact-sections-stack">
            {profile.symptoms?.facial_hair && profile.symptoms?.facial_hair !== "none" && (
              <div className="impact-card-row">
                <h4>{t("wizard.symptoms.facial_hair.title", lang)}</h4>
                <ImpactChips
                  name="facial-hair-impact"
                  value={profile.impact?.facial_hair}
                  onChange={(val) => updateSubField("impact", "facial_hair", val)}
                  lang={lang}
                />
              </div>
            )}

            {profile.symptoms?.acne && profile.symptoms?.acne !== "none" && (
              <div className="impact-card-row">
                <h4>{t("wizard.symptoms.acne.title", lang)}</h4>
                <ImpactChips
                  name="acne-impact"
                  value={profile.impact?.acne}
                  onChange={(val) => updateSubField("impact", "acne", val)}
                  lang={lang}
                />
              </div>
            )}

            {profile.symptoms?.hair_loss && profile.symptoms?.hair_loss !== "none" && (
              <div className="impact-card-row">
                <h4>{t("wizard.symptoms.hair_loss.title", lang)}</h4>
                <ImpactChips
                  name="hair-loss-impact"
                  value={profile.impact?.hair_loss}
                  onChange={(val) => updateSubField("impact", "hair_loss", val)}
                  lang={lang}
                />
              </div>
            )}

            {derivedCtx.cycle_tracking !== "not_applicable" &&
              profile.symptoms?.menstrual &&
              profile.symptoms?.menstrual !== "regular" && (
                <div className="impact-card-row">
                  <h4>{t("wizard.symptoms.menstrual.title", lang)}</h4>
                  <ImpactChips
                    name="menstrual-impact"
                    value={profile.impact?.menstrual}
                    onChange={(val) => updateSubField("impact", "menstrual", val)}
                    lang={lang}
                  />
                </div>
              )}
          </div>
        </div>
      )}

      {/* STEP 4: Metabolic */}
      {currentStep === 4 && (
        <div className="step-panel card">
          <h3 className="section-title">{t("wizard.metabolic.title", lang)}</h3>
          <p className="section-subtitle">{t("wizard.metabolic.subtitle", lang)}</p>

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
              🔬 {t("wizard.metabolic.labs_expander_title", lang)} {showLabsExpander ? "▲" : "▼"}
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
      )}

      {/* STEP 5: Wellbeing */}
      {currentStep === 5 && (
        <div className="step-panel card">
          <h3 className="section-title">{t("wizard.wellbeing.title", lang)}</h3>
          <p className="section-subtitle">{t("wizard.wellbeing.subtitle", lang)}</p>

          {(profile.wellbeing?.phq9_item9 || 0) > 0 && (
            <div className="red-flag-banner urgency-today" role="alert" style={{ marginBottom: "1.5rem" }}>
              <div className="flag-content">
                <div className="flag-title-row">
                  <span className="urgency-chip urgency-today">
                    🚨 {t("wizard.wellbeing.safety_alert_title", lang)}
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
                <h4 className="instrument-heading">📋 PHQ-9 Mood Assessment (9 items)</h4>
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
                              const copy = [...(profile.wellbeing?.phq_answers || Array(9).fill(0))];
                              copy[qIdx] = val;
                              updateSubField("wellbeing", "phq_answers", copy);
                              const total = copy.reduce((a, b) => a + b, 0);
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
                <h4 className="instrument-heading">📋 GAD-7 Anxiety Assessment (7 items)</h4>
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
                              const copy = [...(profile.wellbeing?.gad_answers || Array(7).fill(0))];
                              copy[qIdx] = val;
                              updateSubField("wellbeing", "gad_answers", copy);
                              const total = copy.reduce((a, b) => a + b, 0);
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
      )}

      {/* STEP 6: Main Concern & Red Flags */}
      {currentStep === 6 && (
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
      )}

      {/* Sticky Bottom Action Bar on Mobile */}
      <footer className="wizard-bottom-action-bar">
        <button
          type="button"
          className="btn-wizard-back"
          onClick={handleBack}
          aria-label="Go back to previous step"
        >
          ← {t("wizard.back", lang)}
        </button>

        <button
          type="button"
          className="btn-wizard-next"
          onClick={handleNext}
          aria-label="Continue to next step"
        >
          {currentStep === 6 ? `📋 ${t("wizard.review_button", lang)}` : `${t("wizard.next", lang)} →`}
        </button>
      </footer>
    </div>
  );
}
