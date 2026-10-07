"""
Capture Voice Feature Screenshots (Phase C9)
Captures across 360x640 and 1280x800:
- idle (chat open with mic button)
- consent dialog (modal explaining browser audio processing)
- listening (active recording state)
- transcript review (speech populated into input field, not sent)
- speaking (assistant message read-aloud active)
- unsupported browser (graceful fallback banner)
- crisis reply (tel:14416 Tele-MANAS emergency action)
"""
import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "desktop_1280x800", "width": 1280, "height": 800},
    {"name": "mobile_360x640", "width": 360, "height": 640},
]


def run():
    # 1. Start static frontend server on port 3000
    frontend_build = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
    server_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", "3000", "--directory", frontend_build],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1.5)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)

            for vp in VIEWPORTS:
                v_name = vp["name"]
                w, h = vp["width"], vp["height"]
                print(f"\nCapturing voice screenshots for viewport: {v_name} ({w}x{h})...")

                context = browser.new_context(viewport={"width": w, "height": h})
                page = context.new_page()

                # Mock /chat and /v3/assess API endpoints
                def handle_chat_route(route):
                    payload = route.request.post_data_json or {}
                    msg = payload.get("message", "").lower()
                    if "crisis" in msg or "die" in msg or "suicide" in msg or "harm" in msg or "jeene" in msg:
                        route.fulfill(
                            status=200,
                            content_type="application/json",
                            body='{"reply": "Please know that support is available. Call Tele-MANAS at 14416 (24x7, toll-free) to speak with a trained counselor.", "route": "safety", "kind": "crisis", "urgent": true}'
                        )
                    else:
                        route.fulfill(
                            status=200,
                            content_type="application/json",
                            body='{"reply": "Based on your clinical care map, focusing on hormonal balance with your doctor is your primary next step.", "route": "deterministic", "urgent": false}'
                        )

                page.route("**/chat", handle_chat_route)
                page.route("**/v3/chat", handle_chat_route)

                # Inject speech mocks before load
                page.add_init_script("""
                    class MockSpeechRecognition {
                        constructor() {
                            this.lang = 'en-IN';
                            this.continuous = false;
                            this.interimResults = true;
                            window.__activeRec = this;
                        }
                        start() {
                            window.__recStarted = true;
                        }
                        stop() {
                            window.__recStarted = false;
                            if (this.onend) this.onend();
                        }
                        abort() {
                            window.__recStarted = false;
                        }
                    }
                    window.SpeechRecognition = MockSpeechRecognition;
                    window.webkitSpeechRecognition = MockSpeechRecognition;

                    window.speechSynthesis = {
                        speak: (u) => { window.__speakingUtterance = u; },
                        cancel: () => { window.__speakingUtterance = null; },
                        getVoices: () => [{ lang: 'en-IN', name: 'Google Indian English' }]
                    };
                    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
                """)

                page.goto("http://localhost:3000", wait_until="networkidle")
                time.sleep(1)

                # Ensure the docked chatbot window is open and visible
                if not page.locator(".chatbot-docked-window").is_visible():
                    page.locator(".chatbot-launcher-btn").click(force=True)
                page.locator(".chatbot-docked-window").wait_for(state="visible", timeout=10000)
                time.sleep(0.5)

                # 1. Voice Idle State
                idle_path = os.path.join(OUT_DIR, f"voice_idle_{v_name}.png")
                page.screenshot(path=idle_path)
                print(f"Saved: {idle_path}", flush=True)

                # 2. Voice Consent Dialog
                mic_btn = page.locator(".chatbot-mic-btn")
                mic_btn.click(force=True)
                time.sleep(0.5)
                consent_path = os.path.join(OUT_DIR, f"voice_consent_{v_name}.png")
                page.screenshot(path=consent_path)
                print(f"Saved: {consent_path}", flush=True)

                # 3. Voice Listening State
                accept_btn = page.locator(".btn-modal-accept")
                accept_btn.click(force=True)
                time.sleep(0.5)
                listening_path = os.path.join(OUT_DIR, f"voice_listening_{v_name}.png")
                page.screenshot(path=listening_path)
                print(f"Saved: {listening_path}", flush=True)

                # 4. Voice Transcript Review State (Speech transcript populated, not sent)
                page.evaluate("""() => {
                    if (window.__activeRec && window.__activeRec.onresult) {
                        window.__activeRec.onresult({
                            results: [[{ transcript: "should I consult my gynecologist about irregular periods" }]]
                        });
                    }
                }""")
                time.sleep(0.5)
                review_path = os.path.join(OUT_DIR, f"voice_transcript_review_{v_name}.png")
                page.screenshot(path=review_path)
                print(f"Saved: {review_path}", flush=True)

                # 5. Send message and capture Speaking State
                send_btn = page.locator(".chatbot-send-btn")
                send_btn.click(force=True)
                time.sleep(1)

                # Assistant reply appears -> click Listen button
                listen_btn = page.locator(".chat-tts-btn").first
                if listen_btn.is_visible():
                    listen_btn.click(force=True)
                    time.sleep(0.5)
                speaking_path = os.path.join(OUT_DIR, f"voice_speaking_{v_name}.png")
                page.screenshot(path=speaking_path)
                print(f"Saved: {speaking_path}", flush=True)

                # 6. Crisis Reply State
                input_field = page.locator(".chatbot-input-field")
                input_field.fill("I feel suicidal and in crisis")
                send_btn.click(force=True)
                time.sleep(1)
                crisis_path = os.path.join(OUT_DIR, f"voice_crisis_reply_{v_name}.png")
                page.screenshot(path=crisis_path)
                print(f"Saved: {crisis_path}", flush=True)

                # 7. Unsupported Browser Fallback State
                page.evaluate("""() => {
                    delete window.SpeechRecognition;
                    delete window.webkitSpeechRecognition;
                }""")
                # Click mic again to trigger unsupported error banner
                mic_btn.click(force=True)
                time.sleep(0.5)
                unsupported_path = os.path.join(OUT_DIR, f"voice_unsupported_{v_name}.png")
                page.screenshot(path=unsupported_path)
                print(f"Saved: {unsupported_path}", flush=True)

                context.close()

            browser.close()
    finally:
        server_proc.terminate()
        print("\nAll voice screenshots captured successfully.")


if __name__ == "__main__":
    run()
