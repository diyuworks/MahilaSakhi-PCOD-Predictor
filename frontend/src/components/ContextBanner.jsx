import React from "react";

export default function ContextBanner({ notes = [] }) {
  if (!notes || notes.length === 0) return null;

  return (
    <div className="context-banner" role="status" aria-live="polite">
      <div className="context-banner-body">
        {notes.map((note, idx) => (
          <p key={idx} className="context-banner-text">
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}
