import React, { useState, useEffect } from "react";
import { speak, stopSpeaking } from "../hooks/useVoice";
import { t } from "../i18n";

export default function ReadAloudButton({ text, lang = "en", className = "" }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (speaking) {
        stopSpeaking();
      }
    };
  }, [speaking]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      const ok = speak(text, lang, () => setSpeaking(false));
      if (!ok) setSpeaking(false);
    }
  };

  const label = speaking
    ? t("voice.stop_read_aloud", lang) || "Stop reading"
    : t("voice.read_aloud", lang) || "Read aloud";

  return (
    <button
      type="button"
      className={`btn-read-aloud ${speaking ? "active" : ""} ${className}`}
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{speaking ? "⏹" : "🔊"}</span>
    </button>
  );
}
