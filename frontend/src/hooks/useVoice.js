import { useState, useRef, useCallback, useEffect } from "react";

const getSR = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const voiceSupported = {
  get stt() {
    return !!getSR();
  },
  get tts() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  },
};

/**
 * Maps short UI language codes to BCP-47 speech recognition/synthesis codes
 */
export function getLocaleCode(lang) {
  if (lang === "hi") return "hi-IN";
  if (lang === "gu") return "gu-IN";
  return "en-IN";
}

/**
 * Strips markdown markup (bold, citations, bullets) for natural speech output
 */
export function cleanTextForSpeech(text) {
  if (!text) return "";
  return text
    .replace(/\[\^?\d+\]/g, "") // remove footnote cites like [1], [^1]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // replace markdown links with title
    .replace(/[*_#`~>]/g, "") // remove formatting characters
    .replace(/^\s*[-•*]\s+/gm, "") // remove bullet dashes
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Speech Recognition Hook
 * @param {string} lang UI language ("en" | "hi" | "gu")
 */
export function useVoiceInput(lang = "en") {
  const recRef = useRef(null);
  const [state, setState] = useState("idle"); // idle | listening | error
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);

  const bcp47 = getLocaleCode(lang);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) {
      setError("unsupported");
      setState("error");
      return;
    }

    try {
      if (recRef.current) {
        try {
          recRef.current.abort();
        } catch (_) {}
      }

      const rec = new SR();
      rec.lang = bcp47;
      rec.interimResults = true;
      rec.continuous = false;

      rec.onresult = (e) => {
        const text = Array.from(e.results)
          .map((r) => (r[0] && r[0].transcript) || "")
          .join(" ");
        setTranscript(text);
      };

      rec.onerror = (e) => {
        // Map raw error to standardized friendly keys
        const raw = e && e.error ? e.error : "unknown";
        let mapped = raw;
        if (raw === "not-allowed" || raw === "service-not-allowed") {
          mapped = "not-allowed";
        } else if (raw === "no-speech") {
          mapped = "no-speech";
        } else if (raw === "network") {
          mapped = "network";
        } else if (raw === "language-not-supported") {
          mapped = "language-not-supported";
        }
        setError(mapped);
        setState("error");
      };

      rec.onend = () => {
        setState((current) => (current === "error" ? "error" : "idle"));
      };

      recRef.current = rec;
      setError(null);
      setTranscript("");
      setState("listening");
      rec.start();
    } catch (err) {
      setError("unsupported");
      setState("error");
    }
  }, [bcp47]);

  const stop = useCallback(() => {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch (_) {}
    }
    setState("idle");
  }, []);

  const reset = useCallback(() => {
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch (_) {}
    }
    setError(null);
    setTranscript("");
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      if (recRef.current) {
        try {
          recRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  return { state, transcript, setTranscript, error, start, stop, reset };
}

/**
 * Text-to-Speech Helper
 * @param {string} text Text to read aloud
 * @param {string} lang UI language ("en" | "hi" | "gu")
 * @param {Function} onEnd Callback when speech finishes
 * @returns {boolean} Whether speech synthesis was successfully initiated
 */
export function speak(text, lang = "en", onEnd) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const clean = cleanTextForSpeech(text);
    if (!clean) return false;

    const UtteranceClass =
      (typeof SpeechSynthesisUtterance !== "undefined" && SpeechSynthesisUtterance) ||
      (typeof window !== "undefined" && window.SpeechSynthesisUtterance) ||
      class {
        constructor(t) {
          this.text = t;
        }
      };
    const u = new UtteranceClass(clean);
    const bcp47 = getLocaleCode(lang);
    u.lang = bcp47;

    const rawVoices =
      typeof window.speechSynthesis.getVoices === "function"
        ? window.speechSynthesis.getVoices()
        : [];
    const voices = Array.isArray(rawVoices) ? rawVoices : [];
    // Prioritize exact match, then language prefix
    const matchedVoice =
      voices.find((v) => v && v.lang === bcp47) ||
      voices.find(
        (v) =>
          v &&
          typeof v.lang === "string" &&
          v.lang.startsWith(bcp47.split("-")[0])
      );

    if (matchedVoice) {
      u.voice = matchedVoice;
    }

    u.rate = 0.95;
    if (onEnd) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }

    window.speechSynthesis.speak(u);
    return true;
  } catch (err) {
    console.error("speak error:", err);
    return false;
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
}
