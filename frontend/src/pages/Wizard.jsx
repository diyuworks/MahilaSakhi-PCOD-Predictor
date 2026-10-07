import React, { useState, useMemo } from "react";
import { t } from "../i18n";
import { deriveContext } from "../contextHelper";
import RedFlagBanner from "../components/RedFlagBanner";
import ContextStep from "../components/wizard/ContextStep";
import SymptomsStep from "../components/wizard/SymptomsStep";
import ImpactStep from "../components/wizard/ImpactStep";
import MetabolicStep from "../components/wizard/MetabolicStep";
import WellbeingStep from "../components/wizard/WellbeingStep";
import ConcernStep from "../components/wizard/ConcernStep";

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
      // Menopause is only mandatory for women 45+ or specific surgical exceptions; for younger women it defaults to regular reproductive years
      if (!profile.context?.menopause_status && Number(profile.age) >= 45) {
        setValidationError(
          lang === "hi" ? "कृपया 45+ उम्र के लिए मेनोपॉज की स्थिति चुनें।" : "Please select your menopause status (required for age 45+)."
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
          <span>{validationError}</span>
        </div>
      )}

      {/* STEP 1: Context Gate */}
      {currentStep === 1 && (
        <ContextStep
          profile={profile}
          derivedCtx={derivedCtx}
          updateField={updateField}
          updateSubField={updateSubField}
          lang={lang}
        />
      )}

      {/* STEP 2: Symptoms */}
      {currentStep === 2 && (
        <SymptomsStep
          profile={profile}
          derivedCtx={derivedCtx}
          updateField={updateField}
          updateSubField={updateSubField}
          lang={lang}
        />
      )}

      {/* STEP 3: Impact */}
      {currentStep === 3 && (
        <ImpactStep
          profile={profile}
          derivedCtx={derivedCtx}
          updateSubField={updateSubField}
          lang={lang}
        />
      )}

      {/* STEP 4: Metabolic */}
      {currentStep === 4 && (
        <MetabolicStep
          profile={profile}
          calculatedBmi={calculatedBmi}
          showLabsExpander={showLabsExpander}
          setShowLabsExpander={setShowLabsExpander}
          updateSubField={updateSubField}
          lang={lang}
        />
      )}

      {/* STEP 5: Wellbeing */}
      {currentStep === 5 && (
        <WellbeingStep
          profile={profile}
          telemanasAck={telemanasAck}
          setTelemanasAck={setTelemanasAck}
          updateSubField={updateSubField}
          lang={lang}
        />
      )}

      {/* STEP 6: Main Concern & Red Flags */}
      {currentStep === 6 && (
        <ConcernStep
          profile={profile}
          derivedCtx={derivedCtx}
          updateField={updateField}
          updateSubField={updateSubField}
          lang={lang}
        />
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
          {currentStep === 6 ? t("wizard.review_button", lang) : `${t("wizard.next", lang)} →`}
        </button>
      </footer>
    </div>
  );
}
