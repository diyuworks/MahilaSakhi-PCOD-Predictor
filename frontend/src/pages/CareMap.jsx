import React, { useState } from "react";
import { t } from "../i18n";
import RedFlagBanner from "../components/RedFlagBanner";
import DomainCard from "../components/DomainCard";
import ChatPanel from "../components/ChatPanel";

export default function CareMap({
  assessmentResult,
  profile,
  onRestart,
  lang = "en",
  onDownloadPdf = null,
}) {
  const [addedPrepDomains, setAddedPrepDomains] = useState([]);
  const [showNotApplicable, setShowNotApplicable] = useState(false);

  const toggleAddToPrep = (domainName) => {
    if (addedPrepDomains.includes(domainName)) {
      setAddedPrepDomains(addedPrepDomains.filter((d) => d !== domainName));
    } else {
      setAddedPrepDomains([...addedPrepDomains, domainName]);
    }
  };

  if (!assessmentResult) return null;

  const { priority, pathway, red_flags, context, explanation } = assessmentResult;
  const rankedDomains = priority?.ranked_domains || [];

  // Hidden non-applicable domains
  const allKnownDomains = ["androgen", "menstrual", "metabolic", "fertility", "mental", "sleep", "menopause_bone_cv"];
  const applicableDomains = context?.applicable_domains || [];
  const hiddenDomains = allKnownDomains.filter((d) => !applicableDomains.includes(d));

  const domainLabels = {
    menstrual: lang === "hi" ? "मासिक धर्म व गर्भाशय स्वास्थ्य" : "Menstrual Cycle Tracking",
    fertility: lang === "hi" ? "प्रजनन व गर्भधारण" : "Fertility & Conception Evaluation",
    menopause_bone_cv: lang === "hi" ? "मेनोपॉजल अस्थि व हृदय जांच" : "Menopause & Cardiovascular Care",
  };

  return (
    <div className="caremap-page-layout">
      {/* Header action row */}
      <div className="caremap-header-action card">
        <div className="caremap-header-text">
          <div>
            <h2 className="caremap-main-title">{t("care_map.title", lang)}</h2>
            <p className="card-subtitle">{t("care_map.subtitle", lang)}</p>
          </div>
        </div>

        <div className="caremap-header-btns">
          <button type="button" className="btn-secondary" onClick={onRestart}>
            {t("care_map.restart", lang)}
          </button>
          {onDownloadPdf && (
            <button type="button" className="btn-primary btn-export-pdf" onClick={onDownloadPdf}>
              {t("care_map.export_pdf", lang)}
            </button>
          )}
        </div>
      </div>

      {/* Red Flag Banner at Top */}
      <RedFlagBanner
        flags={red_flags}
        overallUrgency={priority?.overall_urgency || "monitor"}
        lang={lang}
      />

      {/* Structured Guideline Summary */}
      {explanation && (
        <div className="caremap-summary-box card">
          <h3 className="summary-title">{lang === "hi" ? "दिशानिर्देश सारांश" : "Clinical Navigation Summary"}</h3>
          <p className="summary-text">{explanation.summary}</p>
          {explanation.retrieved_chunks?.length > 0 && (
            <div className="verified-citations-note">
              <small>
                <strong>{lang === "hi" ? "सत्यापित दिशानिर्देश संदर्भ:" : "Verified Evidence Sources:"}</strong>{" "}
                {explanation.retrieved_chunks.join(", ")}
              </small>
            </div>
          )}
        </div>
      )}

      {/* Horizontal Severity Bars (Replaces old chart with text values, never color alone) */}
      <div className="domain-bars-visualizer card" role="region" aria-label="Domain Severity Visualizer">
        <h3 className="section-title">
          {lang === "hi" ? "स्वास्थ्य क्षेत्र गंभीरता प्रोफाइल" : "Domain Severity Profile"}
        </h3>
        <p className="card-subtitle">
          {lang === "hi"
            ? "प्रत्येक क्षेत्र का स्तर (0 से 4) आपके दर्ज किए गए लक्षणों और स्वास्थ्य संकेतकों पर आधारित है।"
            : "Scores reflect reported symptom intensity and metabolic risk indicators (Scale 0 to 4)."}
        </p>

        <div className="severity-horizontal-bars-stack">
          {rankedDomains.map((dItem) => {
            const severityScore = dItem.severity || 0;
            const impactScore = dItem.impact || 0;
            const percentage = (severityScore / 4) * 100;
            return (
              <div key={dItem.domain} className="severity-bar-row">
                <div className="bar-label-area">
                  <span className="bar-domain-name">
                    {dItem.domain.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="bar-text-value">
                    Severity: <strong>{severityScore} / 4</strong> | Impact: <strong>{impactScore} / 3</strong>
                  </span>
                </div>
                <div
                  className="bar-track"
                  role="progressbar"
                  aria-valuenow={severityScore}
                  aria-valuemin="0"
                  aria-valuemax="4"
                  aria-label={`${dItem.domain} severity`}
                >
                  <div
                    className={`bar-fill fill-${dItem.tier}`}
                    style={{ width: `${Math.max(percentage, 8)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranked Domain Cards */}
      <div className="domain-cards-list-section">
        <h3 className="section-title">
          {lang === "hi" ? "प्राथमिकता के अनुसार केयर डोमेन" : "Prioritized Care Pathway Cards"}
        </h3>
        <div className="domain-cards-stack">
          {rankedDomains.map((domainItem, index) => (
            <DomainCard
              key={domainItem.domain}
              domainItem={domainItem}
              rank={index + 1}
              pathway={pathway?.[domainItem.domain]}
              lang={lang}
              isAddedToPrep={addedPrepDomains.includes(domainItem.domain)}
              onAddToPrep={toggleAddToPrep}
            />
          ))}
        </div>
      </div>

      {/* Collapsible "Not Applicable to You" Section */}
      {hiddenDomains.length > 0 && (
        <div className="not-applicable-section card">
          <button
            type="button"
            className="btn-toggle-not-applicable"
            onClick={() => setShowNotApplicable(!showNotApplicable)}
            aria-expanded={showNotApplicable}
          >
            {t("care_map.not_applicable_title", lang)} ({hiddenDomains.length}) {showNotApplicable ? "▲" : "▼"}
          </button>

          {showNotApplicable && (
            <div className="not-applicable-content">
              <p className="not-applicable-intro">
                {lang === "hi"
                  ? "आपकी शारीरिक संरचना और संदर्भ के आधार पर निम्नलिखित क्षेत्रों को हटा दिया गया है ताकि आप केवल प्रासंगिक जानकारी पर ध्यान केंद्रित कर सकें:"
                  : "Based on your context gate evaluation, the following areas were safely excluded so you can focus only on what matters:"}
              </p>
              <ul className="not-applicable-list">
                {hiddenDomains.map((hDomain) => (
                  <li key={hDomain}>
                    <strong>{domainLabels[hDomain] || hDomain}:</strong>{" "}
                    {hDomain === "menstrual" && (context?.notes?.find((n) => n.includes("Cycle")) || "Uterus is absent or postmenopausal.")}
                    {hDomain === "fertility" && (lang === "hi" ? "वर्तमान में गर्भधारण प्राथमिकता नहीं है।" : "Currently not pursuing pregnancy or fertility.")}
                    {hDomain === "menopause_bone_cv" && (lang === "hi" ? "उम्र व हार्मोनल स्थिति के अनुसार मेनोपॉज प्रासंगिक नहीं है।" : "Premenopausal context with no menopausal symptoms.")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Floating Right-Side AI Chatbot */}
      <ChatPanel assessmentResult={assessmentResult} profile={profile} lang={lang} />

      {/* Persistent Footer Disclaimer */}
      <footer className="caremap-footer-disclaimer">
        <p>
          <strong>{t("disclaimer_short", lang)}</strong>
        </p>
        <p>
          <small>
            Tele-MANAS Toll-Free National Mental Health Helpline: <strong>14416</strong> (24x7 India).
          </small>
        </p>
      </footer>
    </div>
  );
}
