import React from "react";

export default function SeverityPicker({
  title,
  desc,
  options = [],
  value,
  onChange,
  groupName,
}) {
  return (
    <div className="severity-picker-group" role="radiogroup" aria-labelledby={`${groupName}-title`}>
      <div className="severity-picker-header">
        <h4 id={`${groupName}-title`} className="severity-group-title">
          {title}
        </h4>
        {desc && <p className="severity-group-desc">{desc}</p>}
      </div>

      <div className="severity-cards-grid">
        {options.map((opt) => {
          const isSelected = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`severity-card-btn ${isSelected ? "selected" : ""}`}
              onClick={() => onChange(opt.key)}
            >
              <div className="card-check-indicator" aria-hidden="true">
                {isSelected ? "●" : "○"}
              </div>
              <div className="card-text-block">
                <span className="card-title">{opt.title}</span>
                {opt.desc && <span className="card-desc">{opt.desc}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
