import React, { useState } from "react";
import "./App.css";
import OnboardingWizard from "./components/OnboardingWizard";
import { translations } from "./translations";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

function App() {
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [notification, setNotification] = useState(null);

  // Chat with assistant state
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const t = translations[lang] || translations.en;

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAssessmentComplete = async (profilePayload) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/v3/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      setAssessmentResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Assessment error:", err);
      setErrorMsg(
        lang === "hi"
          ? "मूल्यांकन प्राप्त करने में त्रुटि हुई। कृपया सुनिश्चित करें कि बैकएंड सर्वर सक्रिय है।"
          : `Failed to complete assessment: ${err.message}. Please ensure the backend is running.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async () => {
    if (
      !window.confirm(
        lang === "hi"
          ? "क्या आप अपना सारा स्वास्थ्य डेटा हटाना चाहती हैं? यह DPDP अधिनियम के तहत स्थायी होगा।"
          : "Are you sure you want to delete all session data under DPDP Act 2023?"
      )
    ) {
      return;
    }

    try {
      await fetch(`${API_BASE}/v3/delete`, { method: "DELETE" }).catch(() => {});
    } catch (e) {
      // ignore network errors for local purge
    }

    setAssessmentResult(null);
    setChatHistory([]);
    showNotification(t.dataDeletedMsg);
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const userText = chatMessage.trim();
    const newHistory = [...chatHistory, { sender: "user", text: userText }];
    setChatHistory(newHistory);
    setChatMessage("");
    setChatLoading(true);

    try {
      // Build context string from assessmentResult
      const contextSummary = assessmentResult
        ? `Primary concern: ${assessmentResult.priority?.ranked_domains?.[0]?.domain || "general"}. Urgency: ${
            assessmentResult.priority?.overall_urgency
          }. Context: ${JSON.stringify(assessmentResult.context)}`
        : "User is exploring PCOS care guidance.";

      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          context: contextSummary,
        }),
      });

      const data = await res.json();
      setChatHistory([
        ...newHistory,
        { sender: "assistant", text: data.reply || "Unable to retrieve response." },
      ]);
    } catch (err) {
      setChatHistory([
        ...newHistory,
        {
          sender: "assistant",
          text:
            lang === "hi"
              ? "सहायक से संपर्क नहीं हो पाया। कृपया पुनः प्रयास करें।"
              : "Unable to connect to assistant right now. Please try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Global Toast Notification */}
      {notification && (
        <div className="toast-notification" role="status">
          ✓ {notification}
        </div>
      )}

      {/* Main App Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo-circle">🌸</div>
          <div>
            <h1 className="brand-title">{t.appTitle}</h1>
            <p className="brand-subtitle">{t.appSubtitle}</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-lang-toggle"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            title="Toggle Language / भाषा बदलें"
          >
            🌐 {t.langToggle}
          </button>
          <button
            type="button"
            className="btn-delete-data"
            onClick={handleDeleteData}
            title="India DPDP Act 2023 Data Purge"
          >
            🗑️ {t.deleteData}
          </button>
        </div>
      </header>

      {/* Security & Disclaimer Top Ribbon */}
      <div className="security-ribbon">
        <span>🔒 DPDP Act 2023 Compliant</span>
        <span className="dot">•</span>
        <span>{t.disclaimerBadge}</span>
      </div>

      {/* Main Content Area */}
      <main className="app-main-content">
        {loading && (
          <div className="loading-state-card card">
            <div className="spinner" />
            <h3>
              {lang === "hi"
                ? "आपके स्वास्थ्य डेटा का विश्लेषण हो रहा है..."
                : "Synthesizing your clinical care pathway..."}
            </h3>
            <p>
              {lang === "hi"
                ? "दिशानिर्देशों और संदर्भ के अनुसार प्राथमिकताएं तय की जा रही हैं।"
                : "Grounded in International 2023 PCOS Guidelines & Context Gating."}
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="error-state-card card" role="alert">
            <div className="error-icon">⚠️</div>
            <div>
              <h4>{lang === "hi" ? "त्रुटि" : "Assessment Error"}</h4>
              <p>{errorMsg}</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setErrorMsg(null)}
              >
                {lang === "hi" ? "पुनः प्रयास करें" : "Try Again"}
              </button>
            </div>
          </div>
        )}

        {!loading && !assessmentResult && (
          <OnboardingWizard
            lang={lang}
            onComplete={handleAssessmentComplete}
            onDeleteData={handleDeleteData}
          />
        )}

        {/* Assessment Care Map Result View */}
        {!loading && assessmentResult && (
          <div className="care-map-view">
            <div className="care-map-header card">
              <div className="care-map-title-row">
                <h2>
                  {lang === "hi"
                    ? "🌸 आपका व्यक्तिगत पीसीओडी केयर मैप"
                    : "🌸 Your Personalised PCOS Care Map"}
                </h2>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAssessmentResult(null)}
                >
                  🔄 {t.restart}
                </button>
              </div>

              {/* Red-flag banner at top */}
              {assessmentResult.red_flags?.length > 0 && (
                <div
                  className={`urgency-alert-banner urgency-${assessmentResult.priority?.overall_urgency}`}
                >
                  <div className="alert-icon">⚠️</div>
                  <div>
                    <h4>
                      {assessmentResult.priority?.overall_urgency === "today"
                        ? "Urgent Care Recommended (Today)"
                        : assessmentResult.priority?.overall_urgency === "this_week"
                        ? "Clinical Evaluation Recommended (This Week)"
                        : "Follow-up Recommended (4-6 Weeks)"}
                    </h4>
                    <ul>
                      {assessmentResult.red_flags.map((flag, idx) => (
                        <li key={idx}>{flag.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* LLM / Guideline Explanation */}
              {assessmentResult.explanation && (
                <div className="explanation-section">
                  <h3>
                    {lang === "hi" ? "📖 नैदानिक मार्गदर्शन सारांश" : "📖 Care Summary"}
                  </h3>
                  <div className="explanation-bubble">
                    <p>{assessmentResult.explanation.summary}</p>
                    {assessmentResult.explanation.retrieved_chunks?.length > 0 && (
                      <div className="citations-list">
                        <small>
                          <strong>Verified Guidelines Cited:</strong>{" "}
                          {assessmentResult.explanation.retrieved_chunks.join(", ")}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ranked Domain Cards */}
            <div className="domain-cards-grid">
              {assessmentResult.priority?.ranked_domains?.map((domainItem, idx) => {
                const pathway = assessmentResult.pathway?.[domainItem.domain];
                return (
                  <div
                    key={domainItem.domain}
                    className={`domain-card card tier-${domainItem.tier}`}
                  >
                    <div className="domain-card-header">
                      <span className="rank-number">#{idx + 1}</span>
                      <h3 className="domain-name">
                        {domainItem.domain.replace("_", " ").toUpperCase()}
                      </h3>
                      <span className={`tier-badge badge-${domainItem.tier}`}>
                        {domainItem.tier === "focus_now"
                          ? "Focus Now"
                          : domainItem.tier === "monitor"
                          ? "Monitor"
                          : "Maintain"}
                      </span>
                    </div>

                    <div className="domain-metrics">
                      <span>
                        Severity: <strong>{domainItem.severity} / 4</strong>
                      </span>
                      <span>
                        Daily Impact: <strong>{domainItem.impact} / 3</strong>
                      </span>
                    </div>

                    {pathway && (
                      <div className="pathway-details">
                        {pathway.clinicians?.length > 0 && (
                          <div className="pathway-block">
                            <strong>👩‍⚕️ Clinicians to consult:</strong>
                            <p>{pathway.clinicians.join(", ")}</p>
                          </div>
                        )}

                        {pathway.questions_for_doctor?.length > 0 && (
                          <div className="pathway-block">
                            <strong>💬 Questions to ask your doctor:</strong>
                            <ul>
                              {pathway.questions_for_doctor.map((q, qIdx) => (
                                <li key={qIdx}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {pathway.tests_to_ask_about?.length > 0 && (
                          <div className="pathway-block">
                            <strong>🧪 Tests to discuss:</strong>
                            <p>{pathway.tests_to_ask_about.join(", ")}</p>
                          </div>
                        )}

                        {pathway.monitor?.length > 0 && (
                          <div className="pathway-block">
                            <strong>📊 What to monitor at home:</strong>
                            <p>{pathway.monitor.join(", ")}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI Assistant Chat Section */}
            <div className="card chat-card">
              <h3>💬 {lang === "hi" ? "केयर असिस्टेंट से बात करें" : "Discuss Your Care Map"}</h3>
              <p className="card-subtitle">
                {lang === "hi"
                  ? "अपने केयर मैप या स्वास्थ्य दिशानिर्देशों के बारे में सवाल पूछें।"
                  : "Ask questions grounded strictly in your assessment context & verified guidelines."}
              </p>

              <div className="chat-log">
                {chatHistory.length === 0 && (
                  <p className="chat-placeholder">
                    {lang === "hi"
                      ? "उदाहरण: 'मेरे लिए सबसे पहले कौन सा टेस्ट पूछना चाहिए?'"
                      : "Try asking: 'Which questions should I prioritize for my doctor visit?'"}
                  </p>
                )}
                {chatHistory.map((item, index) => (
                  <div key={index} className={`chat-message ${item.sender}`}>
                    <div className="message-content">{item.text}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-message assistant">
                    <div className="message-content loading">...</div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendChat} className="chat-input-row">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder={
                    lang === "hi"
                      ? "अपने सवाल यहाँ लिखें..."
                      : "Ask about your care recommendations..."
                  }
                  className="chat-text-input"
                />
                <button type="submit" className="btn-primary" disabled={chatLoading}>
                  {lang === "hi" ? "भेजें" : "Send"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          MahilaSakhi v3 • Grounded in the 2023 International Evidence-based Guideline for the
          Assessment and Management of Polycystic Ovary Syndrome (PCOS).
        </p>
        <p>
          <small>
            Strictly Educational Care Navigation. No clinical diagnosis or medical prescription is
            provided. Tele-MANAS crisis helpline: <strong>14416</strong>.
          </small>
        </p>
      </footer>
    </div>
  );
}

export default App;