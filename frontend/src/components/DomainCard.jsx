import React, { useState } from "react";
import { t } from "../i18n";

export default function DomainCard({
  domainItem,
  rank,
  pathway,
  lang = "en",
  onAddToPrep = () => {},
  isAddedToPrep = false,
}) {
  const [isExpanded, setIsExpanded] = useState(rank === 1); // Expand top priority by default

  const tier = domainItem.tier || "maintain";
  const tierLabel = {
    focus_now: t("care_map.tier_focus_now", lang),
    monitor: t("care_map.tier_monitor", lang),
    maintain: t("care_map.tier_maintain", lang),
  }[tier] || tier;

  // Domain display name
  const domainDisplayName = {
    androgen: lang === "hi" ? "हार्मोनल व एंड्रोजन (बाल/त्वचा)" : "Hormonal & Androgen Symptoms",
    menstrual: lang === "hi" ? "मासिक धर्म व गर्भाशय स्वास्थ्य" : "Menstrual Cycle & Bleeding",
    metabolic: lang === "hi" ? "मेटाबॉलिक व इंसुलिन स्वास्थ्य" : "Metabolic & Physical Health",
    fertility: lang === "hi" ? "प्रजनन व गर्भधारण" : "Fertility & Conception",
    mental: lang === "hi" ? "मानसिक स्वास्थ्य व तनाव" : "Emotional Wellbeing & Mood",
    sleep: lang === "hi" ? "नींद व ऊर्जा" : "Sleep & Recovery",
    menopause_bone_cv: lang === "hi" ? "मेनोपॉज, अस्थि व हृदय सुरक्षा" : "Menopause, Bone & Cardiovascular",
  }[domainItem.domain] || domainItem.domain.replace("_", " ");

  // Derive "why this is here"
  const drivingFactors = [];
  if (domainItem.domain === "androgen") {
    drivingFactors.push(lang === "hi" ? "चेहरे/शरीर के बाल या मुंहासों के लक्षण" : "Reported facial hair, acne, or scalp thinning");
  } else if (domainItem.domain === "menstrual") {
    drivingFactors.push(lang === "hi" ? "अनियमित या अनुपस्थित चक्र" : "Reported irregular or infrequent cycle pattern");
  } else if (domainItem.domain === "metabolic") {
    if (domainItem.flags && domainItem.flags.length > 0) {
      drivingFactors.push(
        lang === "hi"
          ? `मेटाबॉलिक संकेत (${domainItem.flags.length} पहचाने गए)`
          : `Metabolic indicators (${domainItem.flags.length} detected: ${domainItem.flags.join(", ")})`
      );
    } else {
      drivingFactors.push(lang === "hi" ? "बीएमआई या जीवनशैली प्रोफाइल" : "Metabolic profile indicators");
    }
  } else if (domainItem.domain === "mental") {
    drivingFactors.push(lang === "hi" ? "तनाव, मनोदशा या भावनात्मक स्कोर" : "Wellbeing or emotional stress score");
  } else if (domainItem.domain === "sleep") {
    drivingFactors.push(lang === "hi" ? "नींद में बाधा का स्तर" : "Reported sleep disturbance level");
  } else if (domainItem.domain === "fertility") {
    drivingFactors.push(lang === "hi" ? "गर्भधारण या प्रजनन प्राथमिकता" : "Reproductive goal or fertility concerns");
  } else if (domainItem.domain === "menopause_bone_cv") {
    drivingFactors.push(lang === "hi" ? "मेनोपॉजल अवस्था या आयु" : "Menopausal transition or preventive bone/CV baseline");
  }

  const whyText = drivingFactors.join(" • ");

  return (
    <div className={`domain-card-item card tier-${tier}`} role="region" aria-label={domainDisplayName}>
      <div className="domain-card-top-row">
        <div className="domain-rank-title">
          <span className="rank-badge" aria-label={`Rank ${rank}`}>#{rank}</span>
          <h4 className="domain-heading">{domainDisplayName}</h4>
        </div>
        <div className={`tier-chip chip-${tier}`}>
          <span className="chip-indicator" aria-hidden="true">●</span>
          <span>{tierLabel}</span>
        </div>
      </div>

      <div className="domain-why-bar">
        <strong>{t("care_map.why_ranked", lang)}</strong> <span>{whyText}</span>
      </div>

      <div className="domain-metrics-row">
        <span className="metric-badge">
          Severity: <strong>{domainItem.severity} / 4</strong>
        </span>
        <span className="metric-badge">
          Daily Impact: <strong>{domainItem.impact} / 3</strong>
        </span>
        <button
          type="button"
          className="btn-toggle-expand"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? "▲ Hide Actions" : "▼ View Actions & Doctor Questions"}
        </button>
      </div>

      {isExpanded && pathway && (
        <div className="domain-pathway-accordion">
          {pathway.clinicians?.length > 0 && (
            <div className="pathway-item-block">
              <h5>{t("care_map.who_to_see", lang)}</h5>
              <p className="clinicians-tags">
                {pathway.clinicians.map((c, i) => (
                  <span key={i} className="clinician-tag">👩‍⚕️ {c}</span>
                ))}
              </p>
            </div>
          )}

          {pathway.tests_to_ask_about?.length > 0 && (
            <div className="pathway-item-block">
              <h5>{t("care_map.tests_to_ask", lang)}</h5>
              <ul className="pathway-list">
                {pathway.tests_to_ask_about.map((testItem, i) => (
                  <li key={i}>{testItem}</li>
                ))}
              </ul>
            </div>
          )}

          {pathway.questions_for_doctor?.length > 0 && (
            <div className="pathway-item-block">
              <h5>{t("care_map.questions_for_doctor", lang)}</h5>
              <ul className="pathway-list questions-list">
                {pathway.questions_for_doctor.map((q, i) => (
                  <li key={i}>"{q}"</li>
                ))}
              </ul>
            </div>
          )}

          {pathway.monitor?.length > 0 && (
            <div className="pathway-item-block">
              <h5>{t("care_map.what_to_monitor", lang)}</h5>
              <ul className="pathway-list">
                {pathway.monitor.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="domain-action-footer">
            <button
              type="button"
              className={`btn-add-prep ${isAddedToPrep ? "added" : ""}`}
              onClick={() => onAddToPrep(domainItem.domain)}
            >
              {isAddedToPrep ? "✓ Added to Visit Prep" : "+ Add Questions to Visit-Prep"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
