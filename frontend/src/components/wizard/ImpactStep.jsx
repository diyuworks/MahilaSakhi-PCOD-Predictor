import React from "react";
import { t } from "../../i18n";
import ImpactChips from "../ImpactChips";
import ReadAloudButton from "../ReadAloudButton";

export default function ImpactStep({
  profile,
  derivedCtx,
  updateSubField,
  lang,
}) {
  const titleText = lang === "hi" ? "दैनिक जीवन और आत्मविश्वास पर प्रभाव" : "Daily Life & Confidence Impact";
  const subtitleText = lang === "hi"
    ? "प्रत्येक लक्षण आपकी दिनचर्या, ऊर्जा या आत्मविश्वास को कितना प्रभावित करता है?"
    : "How significantly does each of your reported symptoms affect your daily life?";

  return (
    <div className="step-panel card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
        <div>
          <h3 className="section-title">{titleText}</h3>
          <p className="section-subtitle">{subtitleText}</p>
        </div>
        <ReadAloudButton text={`${titleText}. ${subtitleText}`} lang={lang} />
      </div>

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
  );
}
