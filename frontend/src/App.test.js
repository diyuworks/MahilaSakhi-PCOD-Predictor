import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import App from "./App";
import { deriveContext } from "./contextHelper";
import personasFixture from "./fixtures/personas_context.json";

test("Landing page renders promise, privacy notice, and disabled Start button until consent", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1, name: /MahilaSakhi/i })).toBeInTheDocument();
  expect(screen.getByText(/A personalised map of what matters most for YOUR PCOS/i)).toBeInTheDocument();

  // Single dismissible educational note is present and can be dismissed
  const eduBanner = screen.getByText(/Educational guidance, not a diagnosis/i);
  expect(eduBanner).toBeInTheDocument();
  const dismissBtn = screen.getByRole("button", { name: /Dismiss/i });
  fireEvent.click(dismissBtn);
  expect(screen.queryByText(/Educational guidance, not a diagnosis/i)).not.toBeInTheDocument();

  const startBtn = screen.getByRole("button", { name: /Start Your Assessment/i });
  expect(startBtn).toBeDisabled();

  // Check consent
  const consentCheckbox = screen.getByRole("checkbox");
  fireEvent.click(consentCheckbox);
  expect(startBtn).not.toBeDisabled();
});

test("Wizard enforces nothing pre-selected on initial load", () => {
  render(<App />);
  // Enter wizard
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /Start Your Assessment/i }));

  // On Step 1: Context Gate
  expect(screen.getByText(/Your Reproductive & Anatomical Context/i)).toBeInTheDocument();

  // Age input is empty (nothing preselected)
  const ageInput = screen.getByLabelText(/Your age \(years\)/i);
  expect(ageInput.value).toBe("");

  // Menopause select has empty selection
  const menoSelect = screen.getByLabelText(/Menopause status/i);
  expect(menoSelect.value).toBe("");

  // Uterus options: none are active
  const yesBtn = screen.getByRole("radio", { name: /Yes/i });
  const noBtn = screen.getByRole("radio", { name: /No \(e\.g\. Hysterectomy\)/i });
  expect(yesBtn).toHaveAttribute("aria-checked", "false");
  expect(noBtn).toHaveAttribute("aria-checked", "false");
});

test("Context gate branching: Uterus 'No' reveals Ovary questions and shows exact cycle note", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /Start Your Assessment/i }));

  // Click 'No'
  const noBtn = screen.getByRole("radio", { name: /No \(e\.g\. Hysterectomy\)/i });
  fireEvent.click(noBtn);
  expect(noBtn).toHaveAttribute("aria-checked", "true");

  // Ovary status appears
  expect(screen.getByText(/What is your ovary status\?/i)).toBeInTheDocument();

  // Exact banner text from context.notes appears verbatim
  expect(
    screen.getByText(
      /Cycle tracking isn't applicable to your current situation\. We'll focus on the health domains that are relevant to you\./i
    )
  ).toBeInTheDocument();
});

test("deriveContext unit test: verifies hysterectomy excludes menstrual domain", () => {
  const ctx = deriveContext({
    uterus: "no",
    ovaries: "both",
    menopause_status: "none",
  });
  expect(ctx.cycle_tracking).toBe("not_applicable");
  expect(ctx.applicable_domains).not.toContain("menstrual");
  expect(ctx.applicable_domains).toContain("androgen");
  expect(ctx.applicable_domains).toContain("metabolic");
});

test("deriveContext unit test: bilateral oophorectomy triggers surgical menopause", () => {
  const ctx = deriveContext({
    uterus: "no",
    ovaries: "neither",
    menopause_status: "none",
  });
  expect(ctx.effective_menopause).toBe("surgical");
  expect(ctx.applicable_domains).toContain("menopause_bone_cv");
  expect(ctx.applicable_domains).not.toContain("menstrual");
});

test("parity test: frontend deriveContext handles all personas fixture cases identically", () => {
  expect(personasFixture.length).toBeGreaterThanOrEqual(15);
  for (const item of personasFixture) {
    const res = deriveContext(item.input);
    expect(res.applicable_domains).toContain("androgen");
    expect(res.applicable_domains).toContain("metabolic");
    expect(res.applicable_domains).toContain("mental");
    expect(res.applicable_domains).toContain("sleep");

    if (item.input.uterus === "no") {
      expect(res.cycle_tracking).toBe("not_applicable");
      expect(res.applicable_domains).not.toContain("menstrual");
      expect(res.applicable_domains).not.toContain("fertility");
    }
    if (item.input.ovaries === "neither") {
      expect(res.effective_menopause).toBe("surgical");
      expect(res.applicable_domains).toContain("menopause_bone_cv");
    }
    if (item.input.menopause_status === "natural") {
      expect(res.cycle_tracking).toBe("not_applicable");
      expect(res.postmenopausal).toBe(true);
    }
  }
});

test("Language toggle switches seamlessly to Hindi (Devanagari)", () => {
  render(<App />);
  const hiBtn = screen.getByRole("button", { name: "हिन्दी" });
  fireEvent.click(hiBtn);

  // Landing page in Hindi
  expect(
    screen.getByText(/आपके शरीर और लक्षणों के अनुसार तैयार पीसीओडी केयर मैप/i)
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /मूल्यांकन शुरू करें/i })).toBeInTheDocument();
});

test("Language toggle switches seamlessly to Gujarati", () => {
  render(<App />);
  const guBtn = screen.getByRole("button", { name: "ગુજરાતી" });
  fireEvent.click(guBtn);

  // Landing page in Gujarati
  expect(
    screen.getByText(/તમારા શરીર અને લક્ષણો માટે વ્યક્તિગત PCOD કેર મેપ/i)
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /મૂલ્યાંકન શરૂ કરો/i })).toBeInTheDocument();
});


test("Tele-MANAS safety alert displays immediately and persistently when self-harm is indicated", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /Start Your Assessment/i }));

  // Fill Step 1 required fields
  fireEvent.change(screen.getByLabelText(/Your age \(years\)/i), { target: { value: "24" } });
  fireEvent.click(screen.getByRole("radio", { name: /Yes/i }));
  fireEvent.change(screen.getByLabelText(/Menopause status/i), { target: { value: "none" } });
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

  // Step 2 Symptoms: choose options
  fireEvent.click(screen.getByRole("radio", { name: /Mild A few scattered, fine hairs/i }));
  fireEvent.click(screen.getByRole("radio", { name: /None Clear skin \/ rare blemishes/i }));
  fireEvent.click(screen.getByRole("radio", { name: /None Normal everyday shedding/i }));
  fireEvent.click(screen.getByRole("radio", { name: /Regular Every 21 to 35 days consistently/i }));
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

  // Step 3 Impact
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

  // Step 4 Metabolic
  fireEvent.change(screen.getByLabelText(/Height \(cm\)/i), { target: { value: "162" } });
  fireEvent.change(screen.getByLabelText(/Weight \(kg\)/i), { target: { value: "58" } });
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

  // Step 5 Wellbeing: check mental scales
  const mentalCheck = screen.getByLabelText(/Include validated PHQ-9 & GAD-7 emotional screening/i);
  fireEvent.click(mentalCheck);

  // Question 9 (item 9): select "Several days" (index 8 among PHQ-9 questions)
  const item9Buttons = screen.getAllByRole("radio", { name: /Several days/i });
  fireEvent.click(item9Buttons[8]);

  // Tele-MANAS emergency banner displays immediately
  expect(screen.getByText(/Urgent Care & Support/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Tele-MANAS at 14416/i)[0]).toBeInTheDocument();
});

