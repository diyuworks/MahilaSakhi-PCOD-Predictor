import React, { useState, useRef, useEffect } from "react";
import { t } from "../i18n";
import { sendChatMessage } from "../api/v3";

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

  // "Still working..." timer after 6 seconds of loading
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

  const handleSend = async (textToSend, isRetry = false) => {
    const query = (textToSend !== undefined ? textToSend : input).trim();
    if (!query || loading) return;

    let updatedMessages;
    if (isRetry) {
      // Do not duplicate in message history when retrying
      updatedMessages = [...messages];
    } else {
      updatedMessages = [...messages, { sender: "user", text: query }];
      setMessages(updatedMessages);
      setInput("");
    }

    setError(null);
    setFailedMessage(null);
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const resolvedProfile = profile && Object.keys(profile).length > 0
        ? profile
        : (assessmentResult?.profile || {});

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
            ? (lang === "hi" ? "बंद करें" : "Close")
            : (lang === "hi" ? "सखी AI सहायक" : "Ask Sakhi AI")}
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
          {/* Header (No misleading 2023 Evidence badge) */}
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

          {/* Starter Chips from i18n */}
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
                  {lang === "hi" ? "ऊपर दिए गए सुझाव पर क्लिक करें या नीचे लिखें।" : "Tap a suggestion above or type below."}
                </small>
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble-row ${m.sender}`}>
                <div className={`chat-bubble ${m.sender}`}>
                  {/* Route Label by route */}
                  {m.sender === "assistant" && m.route && m.route !== "safety" && (
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
                    </div>
                  )}

                  {/* Plain-text formatted message content */}
                  <div className="chat-text-content">
                    {renderMessageText(m.text)}
                  </div>

                  {/* Urgent crisis call link */}
                  {m.sender === "assistant" && (m.urgent || (m.route === "safety" && m.text && m.text.includes("14416"))) && (
                    <div className="chat-crisis-actions">
                      <a href="tel:14416" className="crisis-tel-btn tele-manas" role="button">
                        📞 {t("care_map.call_tele_manas", lang) || "Call Tele-MANAS: 14416 (24x7 Free)"}
                      </a>
                    </div>
                  )}

                  {/* Grounded sources collapsed row */}
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
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble-row assistant">
                <div className="chat-bubble assistant typing-bubble" aria-label="Assistant is typing">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
                {stillWorking && (
                  <div className="chat-still-working-notice" role="status">
                    {t("care_map.chat_still_working", lang) || "Still working..."}
                  </div>
                )}
              </div>
            )}

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

          {/* Input form */}
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
              placeholder={t("care_map.chat_placeholder", lang)}
              className="chatbot-input-field"
              aria-label="Ask assistant a question"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </form>

          {/* Visible "Not a diagnosis" note under input */}
          <div className="chatbot-not-diagnosis-note">
            <small>{t("care_map.chat_not_diagnosis", lang) || "Not a diagnosis • Educational guidance for doctor visits"}</small>
          </div>
        </div>
      )}
    </>
  );
}
