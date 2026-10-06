import React, { useState } from "react";
import "./App.css";
import { t } from "./i18n";
import { assessProfile, deleteUserData, downloadVisitPrepPdf } from "./api/v3";
import Landing from "./pages/Landing";
import Wizard from "./pages/Wizard";
import Review from "./pages/Review";
import CareMap from "./pages/CareMap";
import LanguageToggle from "./components/LanguageToggle";

const createEmptyProfile = () => ({
  age: "",
  reproductive_goal: null,
  main_concern: null,
  context: {
    uterus: null,
    ovaries: null,
    menopause_status: null,
    age_at_menopause: null,
    on_hormonal_contraception: false,
    on_hrt: false,
    pregnant_or_postpartum: false,
  },
  symptoms: {
    facial_hair: null,
    acne: null,
    hair_loss: null,
    menstrual: null,
  },
  impact: {
    facial_hair: null,
    acne: null,
    hair_loss: null,
    menstrual: null,
  },
  metabolic: {
    height_cm: "",
    weight_kg: "",
    waist_cm: "",
    family_history_diabetes: false,
    rapid_weight_gain: false,
    skin_darkening: false,
    known_abnormal_glucose: false,
    known_abnormal_lipids: false,
    tsh: "",
    fsh: "",
    lh: "",
    "Follicle No. (L)": "",
    "Follicle No. (R)": "",
  },
  wellbeing: {
    include_mental_scales: false,
    phq_answers: Array(9).fill(0),
    gad_answers: Array(7).fill(0),
    phq9_total: 0,
    phq9_item9: 0,
    gad7_total: 0,
    sleep_problem_0_4: null,
  },
  red_flags: {
    sudden_severe_pain: false,
    heavy_bleeding_soaking_through: false,
    vaginal_bleeding: false,
  },
  months_since_last_period: "",
});

function App() {
  const [lang, setLang] = useState("en");
  const [currentPage, setCurrentPage] = useState("landing"); // landing | wizard | review | care_map
  const [wizardJumpStep, setWizardJumpStep] = useState(1);
  const [profile, setProfile] = useState(createEmptyProfile());
  const [assessedProfile, setAssessedProfile] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeleteData = async () => {
    if (
      !window.confirm(
        lang === "hi"
          ? "क्या आप अपना सारा स्वास्थ्य डेटा हटाना चाहती हैं? यह DPDP अधिनियम के तहत स्थायी होगा।"
          : "Are you sure you want to delete all session data under DPDP Act 2023?"
      )
    ) {
      return;
    }

    try {
      await deleteUserData();
    } catch (e) {
      // Local purge proceeds regardless
    }

    setProfile(createEmptyProfile());
    setAssessedProfile(null);
    setAssessmentResult(null);
    setCurrentPage("landing");
    showToast(t("data_deleted_notice", lang));
  };

  const handleGenerateCareMap = async () => {
    setLoading(true);
    setErrorNotice(null);

    // Compute BMI for backend payload
    let computedBmi = null;
    const h = Number(profile.metabolic?.height_cm);
    const w = Number(profile.metabolic?.weight_kg);
    if (h > 50 && w > 20) {
      const hm = h / 100;
      computedBmi = parseFloat((w / (hm * hm)).toFixed(1));
    }

    const payload = {
      age: Number(profile.age) || 26,
      reproductive_goal: profile.reproductive_goal || "prefer_not_to_say",
      main_concern: profile.main_concern || "facial_hair",
      context: {
        uterus: profile.context?.uterus || "unsure",
        ovaries: profile.context?.ovaries || null,
        menopause_status: profile.context?.menopause_status || "none",
        age_at_menopause: profile.context?.age_at_menopause ? Number(profile.context.age_at_menopause) : null,
        on_hormonal_contraception: Boolean(profile.context?.on_hormonal_contraception),
        on_hrt: Boolean(profile.context?.on_hrt),
        pregnant_or_postpartum: Boolean(profile.context?.pregnant_or_postpartum),
      },
      symptoms: {
        facial_hair: profile.symptoms?.facial_hair || "none",
        acne: profile.symptoms?.acne || "none",
        hair_loss: profile.symptoms?.hair_loss || "none",
        menstrual: profile.symptoms?.menstrual || "regular",
      },
      impact: {
        facial_hair: profile.impact?.facial_hair || "none",
        acne: profile.impact?.acne || "none",
        hair_loss: profile.impact?.hair_loss || "none",
        menstrual: profile.impact?.menstrual || "none",
      },
      metabolic: {
        bmi: computedBmi,
        waist_cm: profile.metabolic?.waist_cm ? Number(profile.metabolic.waist_cm) : null,
        family_history_diabetes: Boolean(profile.metabolic?.family_history_diabetes),
        rapid_weight_gain: Boolean(profile.metabolic?.rapid_weight_gain),
        skin_darkening: Boolean(profile.metabolic?.skin_darkening),
        known_abnormal_glucose: Boolean(profile.metabolic?.known_abnormal_glucose),
        known_abnormal_lipids: Boolean(profile.metabolic?.known_abnormal_lipids),
        tsh: profile.metabolic?.tsh ? Number(profile.metabolic.tsh) : null,
        fsh: profile.metabolic?.fsh ? Number(profile.metabolic.fsh) : null,
        lh: profile.metabolic?.lh ? Number(profile.metabolic.lh) : null,
        "Follicle No. (L)": profile.metabolic?.["Follicle No. (L)"] ? Number(profile.metabolic["Follicle No. (L)"]) : null,
        "Follicle No. (R)": profile.metabolic?.["Follicle No. (R)"] ? Number(profile.metabolic["Follicle No. (R)"]) : null,
      },
      wellbeing: {
        phq9_total:
          profile.wellbeing?.include_mental_scales && profile.wellbeing?.phq9_total !== undefined && profile.wellbeing?.phq9_total !== null
            ? Number(profile.wellbeing.phq9_total)
            : null,
        phq9_item9:
          profile.wellbeing?.include_mental_scales && profile.wellbeing?.phq9_item9 !== undefined && profile.wellbeing?.phq9_item9 !== null
            ? Number(profile.wellbeing.phq9_item9)
            : null,
        gad7_total:
          profile.wellbeing?.include_mental_scales && profile.wellbeing?.gad7_total !== undefined && profile.wellbeing?.gad7_total !== null
            ? Number(profile.wellbeing.gad7_total)
            : null,
        sleep_problem_0_4:
          profile.wellbeing?.sleep_problem_0_4 !== undefined && profile.wellbeing?.sleep_problem_0_4 !== null
            ? Number(profile.wellbeing.sleep_problem_0_4)
            : 0,
      },
      red_flags: {
        sudden_severe_pain: Boolean(profile.red_flags?.sudden_severe_pain),
        heavy_bleeding_soaking_through: Boolean(profile.red_flags?.heavy_bleeding_soaking_through),
        vaginal_bleeding: Boolean(profile.red_flags?.vaginal_bleeding),
      },
      months_since_last_period: Number(profile.months_since_last_period) || 0,
    };

    try {
      setAssessedProfile(payload);
      const resultData = await assessProfile(payload);
      setAssessmentResult(resultData);
      setCurrentPage("care_map");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Assessment synthesis failed:", err);
      setErrorNotice(
        lang === "hi"
          ? `केयर मैप तैयार करने में त्रुटि: ${err.message}`
          : `Failed to synthesize care map: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      showToast(lang === "hi" ? "विज़िट-प्रेप PDF तैयार हो रही है..." : "Generating visit-prep PDF...");
      await downloadVisitPrepPdf(assessmentResult, profile);
      showToast(lang === "hi" ? "PDF सफलतापूर्वक डाउनलोड हो गई!" : "PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF download failed:", err);
      showToast(lang === "hi" ? "PDF डाउनलोड असफल हुई।" : "Failed to download PDF.");
    }
  };


  return (
    <div className="app-viewport">
      {/* Toast */}
      {toastMessage && (
        <div className="toast-banner" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}

      {/* Global Navigation Header */}
      <header className="global-nav-header">
        <div className="header-brand-container">
          <div className="header-logo-badge" aria-hidden="true">MS</div>
          <div>
            <h1 className="header-brand-name">{t("app_name", lang)}</h1>
            <p className="header-brand-tagline">{t("app_tagline", lang)}</p>
          </div>
        </div>

        <div className="header-controls">
          <LanguageToggle currentLang={lang} onToggle={(newLang) => setLang(newLang)} />
          <button
            type="button"
            className="btn-header-delete"
            onClick={handleDeleteData}
            title={t("delete_data", lang)}
          >
            {t("delete_data", lang)}
          </button>
        </div>
      </header>

      {/* Persistent Security Ribbon */}
      <div className="security-top-ribbon">
        <span>{t("privacy_badge", lang)}</span>
        <span className="dot">•</span>
        <span>{t("disclaimer_short", lang)}</span>
      </div>

      {/* Main Pages Switch */}
      <main className="main-viewport-content">
        {errorNotice && (
          <div className="global-error-card card" role="alert">
            <p>{errorNotice}</p>
            <button type="button" className="btn-secondary" onClick={() => setErrorNotice(null)}>
              Dismiss
            </button>
          </div>
        )}

        {currentPage === "landing" && (
          <Landing
            lang={lang}
            onLanguageChange={(newLang) => setLang(newLang)}
            onStart={() => {
              setCurrentPage("wizard");
              setWizardJumpStep(1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {currentPage === "wizard" && (
          <Wizard
            profile={profile}
            onProfileChange={(updated) => setProfile(updated)}
            onCompleteToReview={() => {
              setCurrentPage("review");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onCancelToLanding={() => {
              setCurrentPage("landing");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            lang={lang}
            jumpToStep={wizardJumpStep}
          />
        )}

        {currentPage === "review" && (
          <Review
            profile={profile}
            onEditSection={(stepNum) => {
              setWizardJumpStep(stepNum);
              setCurrentPage("wizard");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSubmit={handleGenerateCareMap}
            onBack={() => {
              setCurrentPage("wizard");
              setWizardJumpStep(6);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            lang={lang}
            loading={loading}
          />
        )}

        {currentPage === "care_map" && (
          <CareMap
            assessmentResult={assessmentResult}
            profile={assessedProfile || profile}
            onRestart={() => {
              setProfile(createEmptyProfile());
              setAssessedProfile(null);
              setAssessmentResult(null);
              setCurrentPage("landing");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDownloadPdf={handleDownloadPdf}
            lang={lang}
          />
        )}
      </main>
    </div>
  );
}

export default App;