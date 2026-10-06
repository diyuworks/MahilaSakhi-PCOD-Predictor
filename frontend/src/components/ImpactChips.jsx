import React from "react";
import { t } from "../i18n";

export default function ImpactChips({
  value,
  onChange,
  lang = "en",
  label = null,
  name = "impact",
}) {
  const options = [
    { key: "none", label: t("wizard.symptoms.impact_options.none", lang) },
    { key: "a_little", label: t("wizard.symptoms.impact_options.a_little", lang) },
    { key: "quite_a_bit", label: t("wizard.symptoms.impact_options.quite_a_bit", lang) },
    { key: "a_lot", label: t("wizard.symptoms.impact_options.a_lot", lang) },
  ];

  const questionLabel = label || t("wizard.symptoms.impact_question", lang);

  return (
    <div className="impact-chips-wrapper" role="radiogroup" aria-label={questionLabel}>
      <label className="impact-label">{questionLabel}</label>
      <div className="impact-chips-row">
        {options.map((opt) => {
          const isSelected = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`chip-button ${isSelected ? "selected" : ""}`}
              onClick={() => onChange(opt.key)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
