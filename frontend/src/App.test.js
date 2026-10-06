import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";
import { deriveContext } from "./contextHelper";

test("renders MahilaSakhi header and Step 1 Consent screen", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1, name: /MahilaSakhi/i })).toBeInTheDocument();
  expect(screen.getByText(/Your Privacy & Data Protection/i)).toBeInTheDocument();
  expect(screen.getAllByText(/DPDP/i)[0]).toBeInTheDocument();
});

test("enforces consent before advancing to Step 2", () => {
  render(<App />);
  const continueBtn = screen.getByText(/Continue →/i);
  fireEvent.click(continueBtn);

  // Still on step 1 with error
  expect(screen.getByText(/Please agree to the privacy consent/i)).toBeInTheDocument();

  // Check consent
  const checkbox = screen.getByRole("checkbox");
  fireEvent.click(checkbox);
  fireEvent.click(continueBtn);

  // Advances to Step 2
  expect(screen.getByText(/Your Reproductive & Anatomical Context/i)).toBeInTheDocument();
});

test("context gate branching: Uterus 'No' reveals Ovary questions and shows exact cycle note", () => {
  render(<App />);
  // Check consent and proceed
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByText(/Continue →/i));

  // Click 'No (e.g. Hysterectomy)'
  const noUterusBtn = screen.getByText(/No \(e\.g\. Hysterectomy\)/i);
  fireEvent.click(noUterusBtn);

  // Ovary status question appears
  expect(screen.getByText(/What is your ovary status\?/i)).toBeInTheDocument();

  // Dynamic context banner displays exact note
  expect(
    screen.getByText(/Cycle tracking isn't applicable to your current situation/i)
  ).toBeInTheDocument();
});

test("deriveContext helper unit test: hysterectomy and bilateral oophorectomy", () => {
  const ctx = deriveContext({
    uterus: "no",
    ovaries: "neither",
    menopause_status: "none",
  });
  expect(ctx.cycle_tracking).toBe("not_applicable");
  expect(ctx.effective_menopause).toBe("surgical");
  expect(ctx.applicable_domains).toContain("menopause_bone_cv");
  expect(ctx.applicable_domains).not.toContain("menstrual");
  expect(ctx.applicable_domains).not.toContain("fertility");
});

test("toggles language between English and Hindi", () => {
  render(<App />);
  const langBtn = screen.getByTitle(/Toggle Language/i);
  expect(screen.getByText(/हिंदी/i)).toBeInTheDocument();

  fireEvent.click(langBtn);
  // Now in Hindi
  expect(screen.getByText(/आपकी गोपनीयता और डेटा सुरक्षा/i)).toBeInTheDocument();
  expect(screen.getByText(/English/i)).toBeInTheDocument();
});
