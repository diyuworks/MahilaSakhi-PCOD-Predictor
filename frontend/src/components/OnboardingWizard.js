import React, { useState, useMemo } from "react";
import { deriveContext } from "../contextHelper";
import { translations } from "../translations";

const PHQ9_QUESTIONS_EN = [
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

const PHQ9_QUESTIONS_HI = [
  "काम करने में बहुत कम रुचि या आनंद महसूस होना",
  "उदासी, निराशा या डिप्रेशन महसूस होना",
  "नींद आने में परेशानी, बार-बार जागना, या बहुत ज्यादा सोना",
  "थकान महसूस होना या ऊर्जा की कमी लगना",
  "भूख कम लगना या बहुत ज्यादा खाना",
  "अपने बारे में बुरा लगना — कि आप असफल हैं या अपनों को निराश किया है",
  "चीजों पर ध्यान केंद्रित करने में कठिनाई (जैसे पढ़ने या टीवी देखने में)",
  "इतना धीमे चलना/बोलना कि दूसरों को दिखे, या अत्यधिक बेचैनी महसूस होना",
  "ऐसे विचार आना कि मर जाना बेहतर होगा, या खुद को किसी तरह चोट पहुँचाना",
];

const GAD7_QUESTIONS_EN = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it's hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

const GAD7_QUESTIONS_HI = [
  "घबराहट, चिंता या तनाव महसूस होना",
  "चिंता करने से खुद को रोक न पाना या नियंत्रित न कर पाना",
  "अलग-अलग बातों को लेकर बहुत ज्यादा चिंता करना",
  "आराम या रिलैक्स महसूस करने में कठिनाई",
  "इतनी बेचैनी होना कि एक जगह शांत बैठना मुश्किल हो",
  "आसानी से चिड़चिड़ा या गुस्सा हो जाना",
  "ऐसा डर लगना जैसे कुछ बहुत बुरा होने वाला है",
];

export default function OnboardingWizard({ lang, onComplete, onDeleteData }) {
  const t = translations[lang] || translations.en;
  const [step, setStep] = useState(1);
  const [hasConsented, setHasConsented] = useState(false);
  const [consentError, setConsentError] = useState(false);

  // Profile State
  const [age, setAge] = useState(26);
  const [uterus, setUterus] = useState("yes");
  const [ovaries, setOvaries] = useState("both");
  const [menopauseStatus, setMenopauseStatus] = useState("none");
  const [ageAtMeno, setAgeAtMeno] = useState("");
  const [onBirthControl, setOnBirthControl] = useState(false);
  const [onHrt, setOnHrt] = useState(false);
  const [pregnantOrPostpartum, setPregnantOrPostpartum] = useState(false);
  const [reproductiveGoal, setReproductiveGoal] = useState("not_interested");

  // Symptoms & Impact
  const [facialHair, setFacialHair] = useState("none");
  const [facialHairImpact, setFacialHairImpact] = useState("none");
  const [acne, setAcne] = useState("none");
  const [acneImpact, setAcneImpact] = useState("none");
  const [hairLoss, setHairLoss] = useState("none");
  const [hairLossImpact, setHairLossImpact] = useState("none");
  const [menstrual, setMenstrual] = useState("regular");
  const [menstrualImpact, setMenstrualImpact] = useState("none");
  const [monthsAmenorrhea, setMonthsAmenorrhea] = useState(0);

  // Metabolic State
  const [heightCm, setHeightCm] = useState(160);
  const [weightKg, setWeightKg] = useState(58);
  const [waistCm, setWaistCm] = useState("");
  const [familyDiabetes, setFamilyDiabetes] = useState(false);
  const [rapidWeightGain, setRapidWeightGain] = useState(false);
  const [skinDarkening, setSkinDarkening] = useState(false);
  const [abnormalGlucose, setAbnormalGlucose] = useState(false);
  const [abnormalLipids, setAbnormalLipids] = useState(false);
  const [tsh, setTsh] = useState("");
  const [fsh, setFsh] = useState("");
  const [lh, setLh] = useState("");
  const [folliclesLeft, setFolliclesLeft] = useState("");
  const [folliclesRight, setFolliclesRight] = useState("");

  // Wellbeing State
  const [showMentalScales, setShowMentalScales] = useState(true);
  const [phqAnswers, setPhqAnswers] = useState(Array(9).fill(0));
  const [gadAnswers, setGadAnswers] = useState(Array(7).fill(0));
  const [sleepScore, setSleepScore] = useState(1);
  const [stressScore, setStressScore] = useState(1);

  // Chief Concern
  const [mainConcern, setMainConcern] = useState("facial_hair");

  // Red Flags
  const [severePain, setSeverePain] = useState(false);
  const [heavyBleeding, setHeavyBleeding] = useState(false);
  const [postmenoBleeding, setPostmenoBleeding] = useState(false);

  // Dynamic Context Derivation
  const currentContext = useMemo(() => {
    return deriveContext({
      uterus,
      ovaries: uterus === "no" ? ovaries : "both",
      menopause_status: menopauseStatus,
      age: Number(age) || 0,
      reproductive_goal: reproductiveGoal,
      on_hormonal_contraception: onBirthControl,
      on_hrt: onHrt,
    });
  }, [uterus, ovaries, menopauseStatus, age, reproductiveGoal, onBirthControl, onHrt]);

  // Calculated BMI
  const bmi = useMemo(() => {
    if (!heightCm || !weightKg) return null;
    const hM = heightCm / 100;
    return parseFloat((weightKg / (hM * hM)).toFixed(1));
  }, [heightCm, weightKg]);

  // PHQ-9 & GAD-7 Sums
  const phq9Total = useMemo(() => phqAnswers.reduce((a, b) => a + b, 0), [phqAnswers]);
  const gad7Total = useMemo(() => gadAnswers.reduce((a, b) => a + b, 0), [gadAnswers]);
  const phqItem9 = phqAnswers[8];

  const handleNext = () => {
    if (step === 1 && !hasConsented) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    if (step < 6) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = () => {
    const payload = {
      age: Number(age) || 26,
      reproductive_goal: reproductiveGoal,
      main_concern: mainConcern,
      context: {
        uterus,
        ovaries: uterus === "no" ? ovaries : "both",
        menopause_status: menopauseStatus,
        age_at_menopause: ageAtMeno ? Number(ageAtMeno) : null,
        on_hormonal_contraception: onBirthControl,
        on_hrt: onHrt,
        pregnant_or_postpartum: pregnantOrPostpartum,
      },
      symptoms: {
        facial_hair: facialHair,
        acne: acne,
        hair_loss: hairLoss,
        menstrual: currentContext.cycle_tracking === "not_applicable" ? "no_periods" : menstrual,
      },
      impact: {
        facial_hair: facialHairImpact,
        acne: acneImpact,
        hair_loss: hairLossImpact,
        menstrual: menstrualImpact,
      },
      metabolic: {
        bmi: bmi,
        waist_cm: waistCm ? Number(waistCm) : null,
        family_history_diabetes: familyDiabetes,
        rapid_weight_gain: rapidWeightGain,
        skin_darkening: skinDarkening,
        known_abnormal_glucose: abnormalGlucose,
        known_abnormal_lipids: abnormalLipids,
        tsh: tsh ? Number(tsh) : null,
        fsh: fsh ? Number(fsh) : null,
        lh: lh ? Number(lh) : null,
        "Follicle No. (L)": folliclesLeft ? Number(folliclesLeft) : null,
        "Follicle No. (R)": folliclesRight ? Number(folliclesRight) : null,
      },
      wellbeing: {
        phq9_total: showMentalScales ? phq9Total : 0,
        phq9_item9: showMentalScales ? phqItem9 : 0,
        gad7_total: showMentalScales ? gad7Total : 0,
        sleep_problem_0_4: Number(sleepScore) || 0,
        stress_0_4: Number(stressScore) || 0,
      },
      red_flags: {
        sudden_severe_pain: severePain,
        heavy_bleeding_soaking_through: heavyBleeding,
        vaginal_bleeding: currentContext.postmenopausal ? postmenoBleeding : false,
      },
      months_since_last_period: Number(monthsAmenorrhea) || 0,
    };

    onComplete(payload);
  };

  return (
    <div className="wizard-container">
      {/* Step Progress Header */}
      <div className="wizard-progress-card">
        <div className="wizard-progress-header">
          <span className="step-badge">
            {t.step} {step} {t.of} 6
          </span>
          <h2 className="step-title">{t.steps[step]}</h2>
        </div>
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Immediate Tele-MANAS Safety Banner if PHQ9 item 9 > 0 */}
      {phqItem9 > 0 && (
        <div className="telemanas-emergency-banner" role="alert">
          <div className="emergency-icon">🚨</div>
          <div>
            <h4>{t.wellbeing.safetyAlertTitle}</h4>
            <p>{t.wellbeing.safetyAlertText}</p>
          </div>
        </div>
      )}

      {/* STEP 1: Consent */}
      {step === 1 && (
        <div className="step-content">
          <div className="card consent-card">
            <div className="consent-badge">🛡️ {t.consent.subtitle}</div>
            <h3>{t.consent.title}</h3>

            <div className="consent-grid">
              <div className="consent-point">
                <span className="point-icon">🔒</span>
                <div>
                  <strong>{t.consent.point1Title}</strong>
                  <p>{t.consent.point1Desc}</p>
                </div>
              </div>
              <div className="consent-point">
                <span className="point-icon">📋</span>
                <div>
                  <strong>{t.consent.point2Title}</strong>
                  <p>{t.consent.point2Desc}</p>
                </div>
              </div>
              <div className="consent-point">
                <span className="point-icon">🗑️</span>
                <div>
                  <strong>{t.consent.point3Title}</strong>
                  <p>{t.consent.point3Desc}</p>
                </div>
              </div>
            </div>

            <label className={`consent-label ${consentError ? "error" : ""}`}>
              <input
                type="checkbox"
                checked={hasConsented}
                onChange={(e) => {
                  setHasConsented(e.target.checked);
                  if (e.target.checked) setConsentError(false);
                }}
              />
              <span>{t.consent.checkbox}</span>
            </label>
            {consentError && (
              <p className="field-error-text">{t.consent.mustConsent}</p>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Context Gate */}
      {step === 2 && (
        <div className="step-content">
          <div className="card">
            <h3>{t.contextGate.title}</h3>
            <p className="card-subtitle">{t.contextGate.subtitle}</p>

            {/* Context Notes Banner from deriveContext */}
            {currentContext.notes.length > 0 && (
              <div className="context-notes-banner">
                {currentContext.notes.map((note, idx) => (
                  <div key={idx} className="context-note-item">
                    ℹ️ {note}
                  </div>
                ))}
              </div>
            )}

            <div className="form-group">
              <label>{t.contextGate.ageLabel}</label>
              <input
                type="number"
                min="10"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="input-number"
              />
            </div>

            {/* Uterus question */}
            <div className="form-group">
              <label>{t.contextGate.uterusQuestion}</label>
              <div className="segmented-control">
                {[
                  ["yes", t.contextGate.uterusYes],
                  ["no", t.contextGate.uterusNo],
                  ["unsure", t.contextGate.uterusUnsure],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`btn-segment ${uterus === val ? "active" : ""}`}
                    onClick={() => setUterus(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Branching: If uterus == no, ask ovaries */}
            {uterus === "no" && (
              <div className="form-group sub-branch">
                <label>📌 {t.contextGate.ovariesQuestion}</label>
                <div className="radio-group-vertical">
                  {[
                    ["both", t.contextGate.ovariesBoth],
                    ["one", t.contextGate.ovariesOne],
                    ["neither", t.contextGate.ovariesNeither],
                    ["unsure", t.contextGate.ovariesUnsure],
                  ].map(([val, label]) => (
                    <label key={val} className="radio-tile">
                      <input
                        type="radio"
                        name="ovaries"
                        value={val}
                        checked={ovaries === val}
                        onChange={() => setOvaries(val)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Menopause Status */}
            <div className="form-group">
              <label>{t.contextGate.menopauseQuestion}</label>
              <select
                value={menopauseStatus}
                onChange={(e) => setMenopauseStatus(e.target.value)}
                className="select-dropdown"
              >
                <option value="none">{t.contextGate.menoNone}</option>
                <option value="perimenopause">{t.contextGate.menoPeri}</option>
                <option value="natural">{t.contextGate.menoNatural}</option>
                <option value="surgical">{t.contextGate.menoSurgical}</option>
                <option value="unknown">{t.contextGate.menoUnknown}</option>
              </select>
            </div>

            {(menopauseStatus === "natural" || menopauseStatus === "surgical") && (
              <div className="form-group sub-field">
                <label>{t.contextGate.ageAtMeno}</label>
                <input
                  type="number"
                  min="20"
                  max="80"
                  placeholder="e.g. 50"
                  value={ageAtMeno}
                  onChange={(e) => setAgeAtMeno(e.target.value)}
                  className="input-number"
                />
              </div>
            )}

            {/* Hormonal Meds */}
            <div className="form-group">
              <label>{t.contextGate.hormonalQuestion}</label>
              <div className="checkbox-tile-group">
                <label className="checkbox-tile">
                  <input
                    type="checkbox"
                    checked={onBirthControl}
                    onChange={(e) => setOnBirthControl(e.target.checked)}
                  />
                  <span>{t.contextGate.onBirthControl}</span>
                </label>
                <label className="checkbox-tile">
                  <input
                    type="checkbox"
                    checked={onHrt}
                    onChange={(e) => setOnHrt(e.target.checked)}
                  />
                  <span>{t.contextGate.onHrt}</span>
                </label>
              </div>
            </div>

            {/* Pregnancy / Postpartum */}
            <div className="form-group">
              <label className="checkbox-tile">
                <input
                  type="checkbox"
                  checked={pregnantOrPostpartum}
                  onChange={(e) => setPregnantOrPostpartum(e.target.checked)}
                />
                <span>{t.contextGate.pregnantOrPostpartum}</span>
              </label>
            </div>

            {/* Reproductive Goal */}
            <div className="form-group">
              <label>{t.contextGate.goalQuestion}</label>
              <div className="radio-group-vertical">
                {[
                  ["not_interested", t.contextGate.goalNotInterested],
                  ["later", t.contextGate.goalLater],
                  ["trying", t.contextGate.goalTrying],
                  ["fertility_concerns", t.contextGate.goalConcerns],
                  ["prefer_not_to_say", t.contextGate.goalPreferNot],
                ].map(([val, label]) => (
                  <label key={val} className="radio-tile">
                    <input
                      type="radio"
                      name="reproGoal"
                      value={val}
                      checked={reproductiveGoal === val}
                      onChange={() => setReproductiveGoal(val)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Symptoms & Impact */}
      {step === 3 && (
        <div className="step-content">
          <div className="card">
            <h3>{t.symptoms.title}</h3>
            <p className="card-subtitle">{t.symptoms.subtitle}</p>

            {/* Facial Hair */}
            <div className="symptom-card">
              <h4>{t.symptoms.facialHair}</h4>
              <p className="symptom-desc">{t.symptoms.facialHairDesc}</p>
              <div className="segmented-control wrap">
                {[
                  ["none", t.symptoms.facialNone],
                  ["mild", t.symptoms.facialMild],
                  ["moderate", t.symptoms.facialModerate],
                  ["severe", t.symptoms.facialSevere],
                  ["rapidly_worsening", t.symptoms.facialRapid],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`btn-segment ${facialHair === val ? "active" : ""}`}
                    onClick={() => setFacialHair(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {facialHair !== "none" && (
                <div className="impact-subselector">
                  <label>{t.symptoms.impactQuestion}</label>
                  <div className="segmented-control compact">
                    {[
                      ["none", t.symptoms.impactNone],
                      ["a_little", t.symptoms.impactLittle],
                      ["quite_a_bit", t.symptoms.impactQuite],
                      ["a_lot", t.symptoms.impactLot],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={`btn-segment ${facialHairImpact === val ? "active" : ""}`}
                        onClick={() => setFacialHairImpact(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Acne */}
            <div className="symptom-card">
              <h4>{t.symptoms.acne}</h4>
              <p className="symptom-desc">{t.symptoms.acneDesc}</p>
              <div className="segmented-control wrap">
                {[
                  ["none", t.symptoms.acneNone],
                  ["occasional", t.symptoms.acneOccasional],
                  ["persistent", t.symptoms.acnePersistent],
                  ["severe", t.symptoms.acneSevere],
                  ["scarring", t.symptoms.acneScarring],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`btn-segment ${acne === val ? "active" : ""}`}
                    onClick={() => setAcne(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {acne !== "none" && (
                <div className="impact-subselector">
                  <label>{t.symptoms.impactQuestion}</label>
                  <div className="segmented-control compact">
                    {[
                      ["none", t.symptoms.impactNone],
                      ["a_little", t.symptoms.impactLittle],
                      ["quite_a_bit", t.symptoms.impactQuite],
                      ["a_lot", t.symptoms.impactLot],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={`btn-segment ${acneImpact === val ? "active" : ""}`}
                        onClick={() => setAcneImpact(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hair Loss */}
            <div className="symptom-card">
              <h4>{t.symptoms.hairLoss}</h4>
              <p className="symptom-desc">{t.symptoms.hairLossDesc}</p>
              <div className="segmented-control wrap">
                {[
                  ["none", t.symptoms.hairNone],
                  ["mild", t.symptoms.hairMild],
                  ["moderate", t.symptoms.hairModerate],
                  ["severe", t.symptoms.hairSevere],
                  ["progressive", t.symptoms.hairProgressive],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`btn-segment ${hairLoss === val ? "active" : ""}`}
                    onClick={() => setHairLoss(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {hairLoss !== "none" && (
                <div className="impact-subselector">
                  <label>{t.symptoms.impactQuestion}</label>
                  <div className="segmented-control compact">
                    {[
                      ["none", t.symptoms.impactNone],
                      ["a_little", t.symptoms.impactLittle],
                      ["quite_a_bit", t.symptoms.impactQuite],
                      ["a_lot", t.symptoms.impactLot],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={`btn-segment ${hairLossImpact === val ? "active" : ""}`}
                        onClick={() => setHairLossImpact(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Menstrual Question: Conditional on cycle_tracking */}
            {currentContext.cycle_tracking === "not_applicable" ? (
              <div className="info-banner">
                ℹ️ {t.symptoms.menstrualHiddenNote}
              </div>
            ) : (
              <div className="symptom-card">
                <h4>{t.symptoms.menstrual}</h4>
                <p className="symptom-desc">{t.symptoms.menstrualDesc}</p>
                {currentContext.cycle_tracking === "unreliable_on_hormones" && (
                  <div className="warning-banner-soft">
                    ⚠️ {t.symptoms.hormoneMaskingNote}
                  </div>
                )}
                <div className="segmented-control wrap">
                  {[
                    ["regular", t.symptoms.menstrualRegular],
                    ["occasionally_irregular", t.symptoms.menstrualOccasional],
                    ["frequently_irregular", t.symptoms.menstrualFrequent],
                    ["very_infrequent", t.symptoms.menstrualInfrequent],
                    ["no_periods", t.symptoms.menstrualNone],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`btn-segment ${menstrual === val ? "active" : ""}`}
                      onClick={() => setMenstrual(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {menstrual === "no_periods" && (
                  <div className="form-group sub-field">
                    <label>{t.symptoms.monthsAmenorrhea}</label>
                    <input
                      type="number"
                      min="0"
                      value={monthsAmenorrhea}
                      onChange={(e) => setMonthsAmenorrhea(e.target.value)}
                      className="input-number"
                    />
                  </div>
                )}

                <div className="impact-subselector">
                  <label>{t.symptoms.impactQuestion}</label>
                  <div className="segmented-control compact">
                    {[
                      ["none", t.symptoms.impactNone],
                      ["a_little", t.symptoms.impactLittle],
                      ["quite_a_bit", t.symptoms.impactQuite],
                      ["a_lot", t.symptoms.impactLot],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={`btn-segment ${menstrualImpact === val ? "active" : ""}`}
                        onClick={() => setMenstrualImpact(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: Metabolic */}
      {step === 4 && (
        <div className="step-content">
          <div className="card">
            <h3>{t.metabolic.title}</h3>
            <p className="card-subtitle">{t.metabolic.subtitle}</p>

            <div className="grid-2-col">
              <div className="form-group">
                <label>{t.metabolic.height}</label>
                <input
                  type="number"
                  min="100"
                  max="220"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="input-number"
                />
              </div>
              <div className="form-group">
                <label>{t.metabolic.weight}</label>
                <input
                  type="number"
                  min="30"
                  max="250"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="input-number"
                />
              </div>
            </div>

            {bmi && (
              <div className="bmi-badge-container">
                <span className="bmi-value">
                  {t.metabolic.bmi}: <strong>{bmi}</strong> kg/m²
                </span>
                <span
                  className={`bmi-pill ${
                    bmi >= 25 ? "obese" : bmi >= 23 ? "overweight" : "normal"
                  }`}
                >
                  {bmi >= 25
                    ? t.metabolic.bmiObeseNote
                    : bmi >= 23
                    ? t.metabolic.bmiOverweightNote
                    : "Within Standard Asian Range"}
                </span>
              </div>
            )}

            <div className="form-group">
              <label>{t.metabolic.waist}</label>
              <input
                type="number"
                min="40"
                max="180"
                placeholder="e.g. 78"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
                className="input-number"
              />
              <span className="input-hint">{t.metabolic.waistHint}</span>
            </div>

            <div className="form-group">
              <div className="checkbox-tile-group">
                <label className="checkbox-tile">
                  <input
                    type="checkbox"
                    checked={familyDiabetes}
                    onChange={(e) => setFamilyDiabetes(e.target.checked)}
                  />
                  <span>{t.metabolic.familyDiabetes}</span>
                </label>
                <label className="checkbox-tile">
                  <input
                    type="checkbox"
                    checked={rapidWeightGain}
                    onChange={(e) => setRapidWeightGain(e.target.checked)}
                  />
                  <span>{t.metabolic.rapidWeightGain}</span>
                </label>
                <label className="checkbox-tile">
                  <input
                    type="checkbox"
                    checked={skinDarkening}
                    onChange={(e) => setSkinDarkening(e.target.checked)}
                  />
                  <span>{t.metabolic.skinDarkening}</span>
                </label>
                <label className="checkbox-tile">
                  <input
                    type="checkbox"
                    checked={abnormalGlucose}
                    onChange={(e) => setAbnormalGlucose(e.target.checked)}
                  />
                  <span>{t.metabolic.abnormalGlucose}</span>
                </label>
                <label className="checkbox-tile">
                  <input
                    type="checkbox"
                    checked={abnormalLipids}
                    onChange={(e) => setAbnormalLipids(e.target.checked)}
                  />
                  <span>{t.metabolic.abnormalLipids}</span>
                </label>
              </div>
            </div>

            {/* Optional clinical labs */}
            <div className="optional-labs-accordion">
              <h4>🔬 {t.metabolic.labsOptional}</h4>
              <p className="input-hint">{t.metabolic.ultrasoundHint}</p>
              <div className="grid-3-col">
                <div className="form-group">
                  <label>{t.metabolic.tsh}</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="2.5"
                    value={tsh}
                    onChange={(e) => setTsh(e.target.value)}
                    className="input-number"
                  />
                </div>
                <div className="form-group">
                  <label>{t.metabolic.fsh}</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="6.0"
                    value={fsh}
                    onChange={(e) => setFsh(e.target.value)}
                    className="input-number"
                  />
                </div>
                <div className="form-group">
                  <label>{t.metabolic.lh}</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="6.0"
                    value={lh}
                    onChange={(e) => setLh(e.target.value)}
                    className="input-number"
                  />
                </div>
              </div>

              <div className="grid-2-col">
                <div className="form-group">
                  <label>{t.metabolic.folliclesLeft}</label>
                  <input
                    type="number"
                    placeholder="e.g. 14"
                    value={folliclesLeft}
                    onChange={(e) => setFolliclesLeft(e.target.value)}
                    className="input-number"
                  />
                </div>
                <div className="form-group">
                  <label>{t.metabolic.folliclesRight}</label>
                  <input
                    type="number"
                    placeholder="e.g. 15"
                    value={folliclesRight}
                    onChange={(e) => setFolliclesRight(e.target.value)}
                    className="input-number"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Wellbeing */}
      {step === 5 && (
        <div className="step-content">
          <div className="card">
            <h3>{t.wellbeing.title}</h3>
            <p className="card-subtitle">{t.wellbeing.subtitle}</p>

            <div className="form-group">
              <label>{t.wellbeing.sleepQuestion}</label>
              <div className="radio-group-vertical">
                {[
                  [0, t.wellbeing.sleep0],
                  [1, t.wellbeing.sleep1],
                  [2, t.wellbeing.sleep2],
                  [3, t.wellbeing.sleep3],
                  [4, t.wellbeing.sleep4],
                ].map(([val, label]) => (
                  <label key={val} className="radio-tile">
                    <input
                      type="radio"
                      name="sleep"
                      value={val}
                      checked={Number(sleepScore) === val}
                      onChange={() => setSleepScore(val)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Daily Stress & Overwhelm Level (0-4)</label>
              <div className="segmented-control">
                {[0, 1, 2, 3, 4].map((sVal) => (
                  <button
                    key={sVal}
                    type="button"
                    className={`btn-segment ${stressScore === sVal ? "active" : ""}`}
                    onClick={() => setStressScore(sVal)}
                  >
                    Level {sVal}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-tile">
                <input
                  type="checkbox"
                  checked={showMentalScales}
                  onChange={(e) => setShowMentalScales(e.target.checked)}
                />
                <span>{t.wellbeing.phqOptToggle}</span>
              </label>
            </div>

            {showMentalScales && (
              <>
                {/* PHQ-9 Module */}
                <div className="screening-module-card">
                  <h4>🧠 {t.wellbeing.phqSection}</h4>
                  {(lang === "hi" ? PHQ9_QUESTIONS_HI : PHQ9_QUESTIONS_EN).map(
                    (q, idx) => (
                      <div
                        key={idx}
                        className={`survey-question-row ${
                          idx === 8 && phqAnswers[8] > 0 ? "highlight-safety" : ""
                        }`}
                      >
                        <span className="survey-q-text">
                          {idx + 1}. {q}
                        </span>
                        <div className="survey-scale-btns">
                          {[0, 1, 2, 3].map((optVal) => (
                            <button
                              key={optVal}
                              type="button"
                              className={`btn-scale ${
                                phqAnswers[idx] === optVal ? "active" : ""
                              }`}
                              onClick={() => {
                                const copy = [...phqAnswers];
                                copy[idx] = optVal;
                                setPhqAnswers(copy);
                              }}
                            >
                              {optVal === 0
                                ? t.wellbeing.notAtAll
                                : optVal === 1
                                ? t.wellbeing.severalDays
                                : optVal === 2
                                ? t.wellbeing.moreThanHalf
                                : t.wellbeing.nearlyEveryDay}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                  <div className="survey-score-footer">
                    Total PHQ-9 Score: <strong>{phq9Total} / 27</strong>
                  </div>
                </div>

                {/* GAD-7 Module */}
                <div className="screening-module-card">
                  <h4>🕊️ {t.wellbeing.gadSection}</h4>
                  {(lang === "hi" ? GAD7_QUESTIONS_HI : GAD7_QUESTIONS_EN).map(
                    (q, idx) => (
                      <div key={idx} className="survey-question-row">
                        <span className="survey-q-text">
                          {idx + 1}. {q}
                        </span>
                        <div className="survey-scale-btns">
                          {[0, 1, 2, 3].map((optVal) => (
                            <button
                              key={optVal}
                              type="button"
                              className={`btn-scale ${
                                gadAnswers[idx] === optVal ? "active" : ""
                              }`}
                              onClick={() => {
                                const copy = [...gadAnswers];
                                copy[idx] = optVal;
                                setGadAnswers(copy);
                              }}
                            >
                              {optVal === 0
                                ? t.wellbeing.notAtAll
                                : optVal === 1
                                ? t.wellbeing.severalDays
                                : optVal === 2
                                ? t.wellbeing.moreThanHalf
                                : t.wellbeing.nearlyEveryDay}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                  <div className="survey-score-footer">
                    Total GAD-7 Score: <strong>{gad7Total} / 21</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* STEP 6: Main Concern & Red Flags */}
      {step === 6 && (
        <div className="step-content">
          <div className="card">
            <h3>{t.concerns.title}</h3>
            <p className="card-subtitle">{t.concerns.subtitle}</p>

            <div className="radio-group-vertical">
              {Object.entries(t.concerns.options)
                .filter(([key]) => {
                  if (
                    key === "irregular_periods" &&
                    currentContext.cycle_tracking === "not_applicable"
                  ) {
                    return false;
                  }
                  if (
                    key === "fertility" &&
                    !currentContext.applicable_domains.includes("fertility")
                  ) {
                    return false;
                  }
                  if (
                    key === "menopause_symptoms" &&
                    !currentContext.applicable_domains.includes("menopause_bone_cv")
                  ) {
                    return false;
                  }
                  return true;
                })
                .map(([key, label]) => (
                  <label
                    key={key}
                    className={`radio-tile concern-tile ${
                      mainConcern === key ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="mainConcern"
                      value={key}
                      checked={mainConcern === key}
                      onChange={() => setMainConcern(key)}
                    />
                    <div>
                      <strong>{label}</strong>
                    </div>
                  </label>
                ))}
            </div>

            {/* Acute Red Flag Checklist */}
            <div className="red-flags-section">
              <h4>⚠️ Clinical Safety Check (Optional - check if present)</h4>
              <label className="checkbox-tile flag-tile">
                <input
                  type="checkbox"
                  checked={severePain}
                  onChange={(e) => setSeverePain(e.target.checked)}
                />
                <span>Sudden, severe, or worsening pelvic/abdominal pain</span>
              </label>
              <label className="checkbox-tile flag-tile">
                <input
                  type="checkbox"
                  checked={heavyBleeding}
                  onChange={(e) => setHeavyBleeding(e.target.checked)}
                />
                <span>Heavy bleeding soaking through pads/tampons hourly</span>
              </label>
              {currentContext.postmenopausal && (
                <label className="checkbox-tile flag-tile">
                  <input
                    type="checkbox"
                    checked={postmenoBleeding}
                    onChange={(e) => setPostmenoBleeding(e.target.checked)}
                  />
                  <span>Any vaginal bleeding after menopause</span>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="wizard-nav-footer">
        {step > 1 ? (
          <button type="button" className="btn-secondary" onClick={handleBack}>
            ← {t.back}
          </button>
        ) : (
          <div />
        )}
        <button type="button" className="btn-primary" onClick={handleNext}>
          {step === 6 ? `✨ ${t.submit}` : `${t.next} →`}
        </button>
      </div>
    </div>
  );
}
