"""
Automated screenshot generator using Playwright and PyMuPDF.
Captures:
1. Landing screen (360x640 and 1280x800)
2. Hysterectomy path with context gate branching and banner (360x640 and 1280x800)
3. Care Map dashboard with red flag banner (360x640 and 1280x800)
4. Visit-Prep PDF generated report (page 1 high-resolution render)
"""
import os
import sys
import pymupdf
from playwright.sync_api import sync_playwright

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "desktop_1280x800", "width": 1280, "height": 800},
    {"name": "mobile_360x640", "width": 360, "height": 640},
]


def capture():
    # 1. Generate Visit-Prep PDF and render page image
    print("Generating Visit-Prep PDF render with pymupdf...")
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
    from v3.api import assess_profile
    from v3.pdf import generate_visit_prep_pdf

    sample_red_flag = {
        "age": 38,
        "reproductive_goal": "not_interested",
        "main_concern": "facial_hair",
        "context": {"uterus": "no", "ovaries": "both", "menopause_status": "none"},
        "symptoms": {"facial_hair": "rapidly_worsening", "acne": "severe", "hair_loss": "mild"},
        "impact": {"facial_hair": "a_lot"},
        "metabolic": {"bmi": 26.1, "waist_cm": 84, "family_history_diabetes": True},
        "wellbeing": {"phq9_total": None, "gad7_total": None, "sleep_problem_0_4": 1},
        "red_flags": {"rapid_onset_androgen_symptoms": True, "sudden_severe_pain": True}
    }
    res = assess_profile(sample_red_flag)
    pdf_bytes = generate_visit_prep_pdf(res, sample_red_flag)

    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    page = doc.load_page(0)
    pix = page.get_pixmap(dpi=150)
    pdf_img_path = os.path.join(OUT_DIR, "visit_prep_pdf_page.png")
    pix.save(pdf_img_path)
    print(f"Saved PDF render: {pdf_img_path}")

    # 2. Browser Captures
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for vp in VIEWPORTS:
            v_name = vp["name"]
            w, h = vp["width"], vp["height"]
            print(f"\nCapturing for viewport: {v_name} ({w}x{h})...")

            context = browser.new_context(viewport={"width": w, "height": h})
            page = context.new_page()

            # --- SCREEN 1: LANDING ---
            page.goto("http://localhost:3000/")
            page.wait_for_selector(".landing-hero-card")
            page.wait_for_timeout(500)
            landing_path = os.path.join(OUT_DIR, f"landing_{v_name}.png")
            page.screenshot(path=landing_path, full_page=False)
            print(f"Saved: {landing_path}")

            # Accept consent and start
            page.click("#landing-consent-checkbox")
            page.wait_for_timeout(200)
            page.click("button.btn-start-assessment")
            page.wait_for_selector(".wizard-page-layout")

            # --- SCREEN 2: HYSTERECTOMY PATH ---
            # Fill Age: 38
            page.fill("input#input-age", "38")
            # Select Uterus = No (Hysterectomy)
            page.locator("button.card-select-btn").filter(has_text="Hysterectomy").click()
            page.wait_for_selector(".branching-subfield")
            # Ovary status will appear -> Select Both
            page.locator("button.card-select-btn").filter(has_text="Both ovaries present").click()
            page.wait_for_timeout(400)

            hyst_path = os.path.join(OUT_DIR, f"hysterectomy_path_{v_name}.png")
            page.screenshot(path=hyst_path, full_page=False)
            print(f"Saved: {hyst_path}")

            # Close chatbot dock if open so wizard controls are directly accessible
            if page.locator("button.chatbot-close-btn").is_visible():
                page.click("button.chatbot-close-btn")
                page.wait_for_timeout(200)

            # --- NAVIGATE TO CARE MAP (with red flag) ---
            # Step 1: select menopause status -> Step 2
            page.select_option("select#select-menopause", "none")
            page.locator("button.btn-wizard-next").click(force=True)
            page.wait_for_timeout(400)

            # Step 2: Symptoms
            page.locator(".severity-picker-group").filter(has_text="Facial or body hair").locator("button.severity-card-btn").filter(has_text="Rapidly worsening").click()
            page.locator(".severity-picker-group").filter(has_text="Acne").locator("button.severity-card-btn").filter(has_text="Severe").first.click()
            page.locator(".severity-picker-group").filter(has_text="Scalp hair").locator("button.severity-card-btn").filter(has_text="Mild").first.click()
            page.locator("button.btn-wizard-next").click(force=True)
            page.wait_for_timeout(400)

            # Step 3: Impact
            page.locator("button.btn-wizard-next").click(force=True)
            page.wait_for_timeout(400)

            # Step 4: Metabolic
            page.fill("input#input-height", "162")
            page.fill("input#input-weight", "68")
            page.locator("button.btn-wizard-next").click(force=True)
            page.wait_for_timeout(400)

            # Step 5: Wellbeing (PHQ-9/GAD-7 skipped)
            page.locator("button.btn-wizard-next").click(force=True)
            page.wait_for_timeout(400)

            # Step 6: Concern & Red Flags
            page.locator("button.card-select-btn").filter(has_text="Excess facial or body hair").click()
            # Trigger sudden severe pain red flag
            page.locator("label.flag-box").filter(has_text="Sudden, severe").locator("input").click()
            page.locator("button.btn-wizard-next").click(force=True)
            page.wait_for_timeout(500)

            # Review screen -> Submit
            page.wait_for_selector("button.btn-submit-caremap")
            page.locator("button.btn-submit-caremap").click(force=True)
            page.wait_for_selector(".caremap-page-layout", timeout=20000)
            page.wait_for_timeout(1000)

            # --- SCREEN 3: CARE MAP WITH RED FLAG ---
            care_map_path = os.path.join(OUT_DIR, f"care_map_red_flag_{v_name}.png")
            page.screenshot(path=care_map_path, full_page=False)
            print(f"Saved: {care_map_path}")

            context.close()

        browser.close()

    print("\nAll screenshots generated successfully in docs/screenshots/!")


if __name__ == "__main__":
    capture()
