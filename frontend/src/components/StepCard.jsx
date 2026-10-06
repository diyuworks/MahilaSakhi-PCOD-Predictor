import React from "react";

export default function StepCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`step-card-container card ${className}`}>
      {title && <h3 className="step-card-title">{title}</h3>}
      {subtitle && <p className="step-card-subtitle">{subtitle}</p>}
      <div className="step-card-content">{children}</div>
    </div>
  );
}
