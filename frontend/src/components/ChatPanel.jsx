import React, { useState, useRef, useEffect } from "react";
import { t } from "../i18n";
import { sendChatMessage } from "../api/v3";
import { useVoiceInput, speak, stopSpeaking, voiceSupported } from "../hooks/useVoice";

function renderMessageText(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="chat-bullet-list">
          {currentList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      const bulletText = trimmed.replace(/^[•\-*]\s*/, "");
      currentList.push(bulletText);
    } else {
      flushList();
      elements.push(
        <p key={`p-${index}`} className="chat-paragraph">
          {line}
        </p>
      );
    }
  });

  flushList();
  return elements;
}

export default function ChatPanel({ assessmentResult, profile = {}, lang = "en", defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [failedMessage, setFailedMessage] = useState(null);
  const [stillWorking, setStillWorking] = useState(false);

  // Voice States (stored in React state only per zero-persistence privacy rule)
  const [hasVoiceConsent, setHasVoiceConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [voiceError, setVoiceError] = useState(null);

  const {
    state: voiceState,
    transcript,
    error: sttError,
    start: startVoice,
    stop: stopVoice,
    reset: resetVoice,
  } = useVoiceInput(lang);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const starterChips = t("care_map.chat_chips", lang) || [
    "What should I ask my doctor first?",
    "Why is this my top priority?",
    "What lifestyle habits support my main concern?",
  ];

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading, stillWorking]);

  // "Still working..." timer after 6 seconds of loading (C7)
  useEffect(() => {
    let timer;
    if (loading) {
      setStillWorking(false);
      timer = setTimeout(() => {
        setStillWorking(true);
      }, 6000);
    } else {
      setStillWorking(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // When speech transcript updates, populate input box without auto-sending (C2)
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // STT error propagation (C5)
  useEffect(() => {
    if (sttError) {
      setVoiceError(sttError);
    }
  }, [sttError]);

  // Clean up speaking when panel closes or unmounts
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleSend = async (textToSend, isRetry = false) => {
    const query = (textToSend !== undefined ? textToSend : input).trim();
    if (!query || loading) return;

    // Stop active listening or speaking when sending
    if (voiceState === "listening") {
      stopVoice();
    }
    if (speakingIdx !== null) {
      stopSpeaking();
      setSpeakingIdx(null);
    }

    let updatedMessages;
    if (isRetry) {
      updatedMessages = [...messages];
    } else {
      updatedMessages = [...messages, { sender: "user", text: query }];
      setMessages(updatedMessages);
      setInput("");
      resetVoice();
    }

    setError(null);
    setFailedMessage(null);
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const resolvedProfile =
        profile && Object.keys(profile).length > 0
          ? profile
          : assessmentResult?.profile || {};

      const res = await sendChatMessage({
        message: query,
        profile: resolvedProfile,
        lang,
        history: historyPayload,
      });

      setMessages([
        ...updatedMessages,
        {
          sender: "assistant",
          text: res.reply,
          route: res.route,
          kind: res.kind,
          urgent: Boolean(res.urgent),
          cites: Array.isArray(res.cites) ? res.cites : [],
        },
      ]);
      setFailedMessage(null);
    } catch (err) {
      console.error("Chat error:", err);
      setFailedMessage(query);
      setError(
        lang === "hi"
          ? "सहायक से उत्तर प्राप्त नहीं हो सका। कृपया पुनः प्रयास करें।"
          : "Unable to reach assistant. Please try again."
      );
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleRetry = () => {
    if (!failedMessage) return;
    handleSend(failedMessage, true);
  };

  // Mic Button Click Handler (C1, C4)
  const handleMicClick = () => {
    setVoiceError(null);
    if (!voiceSupported.stt) {
      setVoiceError("unsupported");
      return;
    }
    if (!hasVoiceConsent) {
      setShowConsentModal(true);
      return;
    }
    if (voiceState === "listening") {
      stopVoice();
    } else {
      startVoice();
    }
  };

  // Voice Consent Accepted Handler (C4)
  const handleConsentAccept = () => {
    setHasVoiceConsent(true);
    setShowConsentModal(false);
    startVoice();
  };

  // Assistant Message TTS (Listen / Stop) Handler (C3)
  const handleToggleSpeak = (msgText, idx) => {
    if (speakingIdx === idx) {
      stopSpeaking();
      setSpeakingIdx(null);
    } else {
      stopSpeaking();
      setSpeakingIdx(idx);
      const ok = speak(msgText, lang, () => {
        setSpeakingIdx(null);
      });
      if (!ok) {
        setSpeakingIdx(null);
        setVoiceError("tts_unavailable");
      }
    }
  };

  const getVoiceErrorMessage = () => {
    if (!voiceError) return null;
    switch (voiceError) {
      case "unsupported":
        return t("voice.err_unsupported", lang) || "Voice input is not supported in this browser. You can continue typing.";
      case "not-allowed":
        return t("voice.err_not_allowed", lang) || "Microphone access was denied. Please allow microphone permissions, or continue typing.";
      case "no-speech":
        return t("voice.err_no_speech", lang) || "No speech detected. Please try again or type your question.";
      case "network":
        return t("voice.err_network", lang) || "Speech recognition network issue. Please check your connection or continue typing.";
      case "language-not-supported":
        return t("voice.err_language", lang) || "Voice input is not available in this language on your browser. Please type your question.";
      case "tts_unavailable":
        return t("voice.tts_unavailable", lang) || "Text-to-speech voice is unavailable on this device.";
      default:
        return t("voice.err_network", lang) || "Voice issue encountered. You can continue typing.";
    }
  };

  return (
    <>
      {/* Floating launcher trigger button at bottom-right */}
      <button
        type="button"
        className={`chatbot-launcher-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Care Map Chatbot"
        title={isOpen ? "Close AI Assistant" : "Chat with Sakhi AI Assistant"}
      >
        <span className="launcher-text">
          {isOpen
            ? lang === "hi"
              ? "बंद करें"
              : "Close"
            : lang === "hi"
            ? "सखी AI सहायक"
            : "Ask Sakhi AI"}
        </span>
        {!isOpen && <span className="launcher-pulse-dot" aria-hidden="true"></span>}
      </button>

      {/* Floating docked chatbot window */}
      {isOpen && (
        <div
          className="chatbot-docked-window"
          role="region"
          aria-label="Care Map AI Assistant Chatbot"
        >
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar" aria-hidden="true">AI</div>
              <div>
                <h4 className="chatbot-title">
                  {lang === "hi" ? "सखी AI सहायक" : "Sakhi AI Assistant"}
                </h4>
              </div>
            </div>
            <button
              type="button"
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close Chat"
            >
              ✕
            </button>
          </div>

          {/* Starter Chips */}
          <div className="chat-starter-chips-docked" role="group" aria-label="Suggested questions">
            {Array.isArray(starterChips) &&
              starterChips.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  className="starter-chip-pill"
                  onClick={() => handleSend(chip)}
                  disabled={loading}
                >
                  {chip}
                </button>
              ))}
          </div>

          {/* Message Thread */}
          <div className="chatbot-messages-area" aria-live="polite">
            {messages.length === 0 && (
              <div className="chat-empty-welcome">
                <p className="welcome-text">
                  {lang === "hi"
                    ? "नमस्ते! अपनी प्राथमिकताओं, डॉक्टर से चर्चा या जीवनशैली से जुड़े सवाल पूछें।"
                    : "Hello! Ask anything about your priorities, doctor questions, or lifestyle guidance."}
                </p>
                <small className="welcome-hint">
                  {lang === "hi"
                    ? "ऊपर दिए गए सुझाव पर क्लिक करें या बोलकर/लिखकर पूछें।"
                    : "Tap a suggestion above, type, or tap the microphone to speak."}
                </small>
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble-row ${m.sender}`}>
                <div className={`chat-bubble ${m.sender}`}>
                  {/* Route Label badge */}
                  {m.sender === "assistant" && m.route && (
                    <div className="chat-route-badge-container">
                      {m.route === "deterministic" && (
                        <span className="chat-route-badge deterministic">
                          {t("care_map.chat_routes.deterministic", lang) || "From your Care Map"}
                        </span>
                      )}
                      {m.route === "grounded" && (
                        <span className="chat-route-badge grounded">
                          {t("care_map.chat_routes.grounded", lang) || "Based on guideline excerpts"}
                        </span>
                      )}
                      {m.route === "fallback" && (
                        <span className="chat-route-badge fallback">
                          {t("care_map.chat_routes.fallback", lang) || "Not enough verified info; here's what to ask your doctor"}
                        </span>
                      )}
                      {m.route === "safety" && (
                        <span className="chat-route-badge safety">
                          {t("care_map.chat_routes.safety", lang) || "Safety guidance"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="chat-text-content">
                    {renderMessageText(m.text)}
                  </div>

                  {/* Urgent Crisis Call Action (C3) */}
                  {m.sender === "assistant" &&
                    (m.urgent ||
                      (m.route === "safety" && m.text && m.text.includes("14416"))) && (
                      <div className="chat-crisis-actions">
                        <a
                          href="tel:14416"
                          className="crisis-tel-btn tele-manas"
                          role="button"
                          aria-label="Call Tele-MANAS hotline at 14416"
                        >
                          📞 {t("care_map.call_tele_manas", lang) || "Call Tele-MANAS: 14416 (24x7 Free)"}
                        </a>
                      </div>
                    )}

                  {/* Grounded Sources Collapsible */}
                  {m.sender === "assistant" && m.route === "grounded" && m.cites?.length > 0 && (
                    <details className="chat-sources-accordion">
                      <summary className="chat-sources-summary">
                        {t("care_map.chat_routes.sources", lang) || "Sources"} ({m.cites.length})
                      </summary>
                      <ul className="chat-sources-list">
                        {m.cites.map((citeId) => (
                          <li key={citeId} className="chat-source-item">{citeId}</li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* Assistant TTS Listen / Stop Button (C3) */}
                  {m.sender === "assistant" && (
                    <div className="chat-message-actions">
                      <button
                        type="button"
                        className={`chat-tts-btn ${speakingIdx === idx ? "active" : ""}`}
                        onClick={() => handleToggleSpeak(m.text, idx)}
                        aria-label={
                          speakingIdx === idx
                            ? t("voice.stop", lang) || "Stop"
                            : t("voice.listen", lang) || "Listen"
                        }
                        title={
                          speakingIdx === idx
                            ? t("voice.stop", lang) || "Stop"
                            : t("voice.listen", lang) || "Listen"
                        }
                      >
                        {speakingIdx === idx ? "⏹ " : "🔊 "}
                        {speakingIdx === idx
                          ? t("voice.stop", lang) || "Stop"
                          : t("voice.listen", lang) || "Listen"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Latency UX: Thinking & Still working (C7) */}
            {loading && (
              <div className="chat-bubble-row assistant">
                <div
                  className="chat-bubble assistant typing-bubble"
                  aria-label="Assistant is thinking"
                  role="status"
                >
                  <span className="typing-text">
                    {t("care_map.chat_thinking", lang) || "Thinking..."}
                  </span>
                  <span className="typing-dot" aria-hidden="true"></span>
                  <span className="typing-dot" aria-hidden="true"></span>
                  <span className="typing-dot" aria-hidden="true"></span>
                </div>
                {stillWorking && (
                  <div className="chat-still-working-notice" role="status">
                    {t("care_map.chat_still_working", lang) || "Still working..."}
                  </div>
                )}
              </div>
            )}

            {/* General Network Error */}
            {error && (
              <div className="chat-error-notice" role="alert">
                <span>{error}</span>
                <button
                  type="button"
                  className="btn-retry"
                  onClick={handleRetry}
                  aria-label="Retry sending failed message"
                >
                  {t("care_map.chat_retry", lang) || "Retry"}
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice Error Banner (C5) */}
          {voiceError && (
            <div className="chat-voice-error-banner" role="alert">
              <span className="voice-error-text">{getVoiceErrorMessage()}</span>
              <button
                type="button"
                className="btn-voice-error-dismiss"
                onClick={() => setVoiceError(null)}
                aria-label="Dismiss voice error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Bar: typing NEVER blocked during loading (C7) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="chatbot-input-bar"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                voiceState === "listening"
                  ? t("voice.mic_listening", lang) || "Listening... speak now"
                  : t("care_map.chat_placeholder", lang)
              }
              className={`chatbot-input-field ${voiceState === "listening" ? "listening-active" : ""}`}
              aria-label="Ask assistant a question"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="chatbot-input-btn-group">
              {/* Mic Button: min 44px touch target, states: idle/listening/speaking (C1) */}
              <button
                type="button"
                className={`chatbot-mic-btn ${voiceState === "listening" ? "listening" : ""} ${speakingIdx !== null ? "speaking" : ""}`}
                onClick={handleMicClick}
                aria-label={
                  voiceState === "listening"
                    ? t("voice.mic_stop", lang) || "Stop listening"
                    : t("voice.mic_label", lang) || "Speak question"
                }
                title={
                  voiceState === "listening"
                    ? t("voice.mic_stop", lang) || "Stop listening"
                    : t("voice.mic_label", lang) || "Speak question"
                }
              >
                {voiceState === "listening" ? "⏹" : "🎙"}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                className="chatbot-send-btn"
                disabled={loading || !input.trim()}
                aria-label="Send message"
              >
                ➤
              </button>
            </div>
          </form>

          {/* Not a Diagnosis note */}
          <div className="chatbot-not-diagnosis-note">
            <small>
              {t("care_map.chat_not_diagnosis", lang) ||
                "Not a diagnosis • Educational guidance for doctor visits"}
            </small>
          </div>
        </div>
      )}

      {/* Voice Consent Modal (C4) - state in React only */}
      {showConsentModal && (
        <div
          className="modal-backdrop voice-consent-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-consent-title"
        >
          <div className="modal-dialog-box voice-consent-card">
            <h3 id="voice-consent-title" className="voice-consent-title">
              {t("voice.consent_title", lang) || "Voice Input & Privacy"}
            </h3>
            <p className="voice-consent-text">
              {t("voice.consent_p1", lang) ||
                "Voice recognition is processed by your browser's speech service (such as Google for Chrome). MahilaSakhi never records or stores your audio or transcripts."}
            </p>
            <p className="voice-consent-text tip-text">
              🎧 {t("voice.consent_p2", lang) ||
                "For your privacy, we recommend using headphones in public or shared places."}
            </p>
            <div className="voice-consent-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowConsentModal(false)}
              >
                {t("voice.consent_cancel", lang) || "Cancel"}
              </button>
              <button
                type="button"
                className="btn-modal-accept"
                onClick={handleConsentAccept}
              >
                {t("voice.consent_accept", lang) || "I Understand & Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
