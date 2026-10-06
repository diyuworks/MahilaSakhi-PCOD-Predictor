import React, { useState } from "react";
import { t } from "../i18n";
import { sendChatMessage } from "../api/v3";

export default function ChatPanel({ assessmentResult, lang = "en" }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const starterChips = [
    lang === "hi" ? "मुझे डॉक्टर से सबसे पहले क्या पूछना चाहिए?" : "What should I ask my doctor first?",
    lang === "hi" ? "यह क्षेत्र मेरी शीर्ष प्राथमिकता क्यों है?" : "Why is this my top priority?",
    lang === "hi" ? "मेरे लक्षणों के लिए कौन सी जीवनशैली में बदलाव उपयोगी हैं?" : "What lifestyle habits support my main concern?",
  ];

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = { sender: "user", text: query };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const topDomain = assessmentResult?.priority?.ranked_domains?.[0]?.domain || "general";
      const urgency = assessmentResult?.priority?.overall_urgency || "monitor";
      const contextStr = `Top domain: ${topDomain}. Urgency: ${urgency}. Context: ${JSON.stringify(
        assessmentResult?.context || {}
      )}. Prioritized areas: ${JSON.stringify(
        assessmentResult?.priority?.ranked_domains?.map((d) => d.domain) || []
      )}`;

      const res = await sendChatMessage(query, contextStr);
      setMessages([...updatedHistory, { sender: "assistant", text: res.reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setError(
        lang === "hi"
          ? "सहायक से उत्तर प्राप्त नहीं हो सका। कृपया पुनः प्रयास करें।"
          : "Unable to reach assistant. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-panel card" role="region" aria-label="Care Map AI Assistant">
      <div className="chat-panel-header">
        <h3>💬 {t("care_map.chat_title", lang)}</h3>
        <p className="card-subtitle">{t("care_map.chat_subtitle", lang)}</p>
      </div>

      {/* Starter chips */}
      <div className="chat-starter-chips" role="group" aria-label="Suggested questions">
        {starterChips.map((chip, i) => (
          <button
            key={i}
            type="button"
            className="starter-chip-btn"
            onClick={() => handleSend(chip)}
            disabled={loading}
          >
            💭 {chip}
          </button>
        ))}
      </div>

      {/* Conversation Thread */}
      <div className="chat-messages-container" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <p>
              {lang === "hi"
                ? "दिशानिर्देशों के आधार पर अपने सवालों के जवाब पाने के लिए ऊपर दिए गए सुझावों पर क्लिक करें या अपना प्रश्न लिखें।"
                : "Ask anything about your priority areas, questions for your doctor, or next steps."}
            </p>
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={`chat-bubble-row ${m.sender}`}>
            <div className={`chat-bubble ${m.sender}`}>
              <p>{m.text}</p>
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
          </div>
        )}

        {error && (
          <div className="chat-error-notice" role="alert">
            <span>⚠️ {error}</span>
            <button
              type="button"
              className="btn-retry"
              onClick={() => handleSend(messages[messages.length - 1]?.text)}
            >
              {lang === "hi" ? "पुनः प्रयास करें" : "Retry"}
            </button>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="chat-form-row"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("care_map.chat_placeholder", lang)}
          className="chat-input-field"
          aria-label="Ask assistant a question"
          disabled={loading}
        />
        <button type="submit" className="btn-chat-send" disabled={loading || !input.trim()}>
          {lang === "hi" ? "पूछें" : "Ask"}
        </button>
      </form>

      <div className="chat-disclaimer-note">
        <small>ℹ️ {t("care_map.chat_disclaimer", lang)}</small>
      </div>
    </div>
  );
}
