import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ChatPanel from "./ChatPanel";
import { sendChatMessage } from "../api/v3";

jest.mock("../api/v3", () => ({
  sendChatMessage: jest.fn(),
}));

const mockProfile = {
  age: 28,
  reproductive_goal: "not_interested",
  main_concern: "facial_hair",
  context: { uterus: "yes", ovaries: "both" },
  symptoms: { facial_hair: "moderate" },
  impact: { facial_hair: "a_lot" },
};

const mockAssessmentResult = {
  profile: mockProfile,
  priority: {
    ranked_domains: [{ domain: "androgen", severity: 3, tier: "focus_now" }],
    overall_urgency: "monitor",
  },
  context: { applicable_domains: ["androgen", "metabolic"] },
};

describe("ChatPanel Component (v2)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Starter chips send the right payload including profile", async () => {
    sendChatMessage.mockResolvedValueOnce({
      reply: "Here are questions to ask your clinician.",
      route: "deterministic",
      urgent: false,
    });

    render(
      <ChatPanel
        defaultOpen={true}
        profile={mockProfile}
        assessmentResult={mockAssessmentResult}
        lang="en"
      />
    );

    // Header does NOT contain misleading badge
    expect(screen.queryByText(/2023 Evidence Grounded/i)).not.toBeInTheDocument();

    // Click starter chip
    const firstChip = screen.getByRole("button", { name: /What should I ask my doctor first\?/i });
    fireEvent.click(firstChip);

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledTimes(1);
    });

    expect(sendChatMessage).toHaveBeenCalledWith({
      message: "What should I ask my doctor first?",
      profile: mockProfile,
      lang: "en",
      history: [],
    });

    // Assistant reply appears
    expect(await screen.findByText(/Here are questions to ask your clinician/i)).toBeInTheDocument();
  });

  test("Crisis reply displays prominent tel:14416 link", async () => {
    sendChatMessage.mockResolvedValueOnce({
      reply: "Please call Tele-MANAS at 14416 (free, 24x7). Real people can help you right now.",
      route: "safety",
      kind: "crisis",
      urgent: true,
    });

    render(
      <ChatPanel
        defaultOpen={true}
        profile={mockProfile}
        assessmentResult={mockAssessmentResult}
        lang="en"
      />
    );

    const input = screen.getByLabelText(/Ask assistant a question/i);
    fireEvent.change(input, { target: { value: "I want to die" } });
    fireEvent.submit(input.closest("form"));

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledTimes(1);
    });

    // Verify tel link is rendered
    const telLink = await screen.findByRole("button", { name: /14416/i });
    expect(telLink).toBeInTheDocument();
    expect(telLink.closest("a")).toHaveAttribute("href", "tel:14416");
  });

  test("Displays correct badge text for each route", async () => {
    // 1. Deterministic
    sendChatMessage.mockResolvedValueOnce({
      reply: "Hormonal health questions.",
      route: "deterministic",
    });

    const { rerender } = render(
      <ChatPanel
        defaultOpen={true}
        profile={mockProfile}
        assessmentResult={mockAssessmentResult}
        lang="en"
      />
    );

    const input = screen.getByLabelText(/Ask assistant a question/i);
    fireEvent.change(input, { target: { value: "questions" } });
    fireEvent.submit(input.closest("form"));

    expect(await screen.findByText("From your Care Map")).toBeInTheDocument();

    // 2. Grounded route with cites
    sendChatMessage.mockResolvedValueOnce({
      reply: "Evidence based excerpt answer.",
      route: "grounded",
      cites: ["PCOS-GL-2023-01"],
    });

    fireEvent.change(input, { target: { value: "hair options" } });
    fireEvent.submit(input.closest("form"));

    expect(await screen.findByText("Based on guideline excerpts")).toBeInTheDocument();
    expect(screen.getByText(/Sources/i)).toBeInTheDocument();
    expect(screen.getByText("PCOS-GL-2023-01")).toBeInTheDocument();

    // 3. Fallback route
    sendChatMessage.mockResolvedValueOnce({
      reply: "Fallback answer asking doctor.",
      route: "fallback",
    });

    fireEvent.change(input, { target: { value: "tell me magic" } });
    fireEvent.submit(input.closest("form"));

    expect(
      await screen.findByText("Not enough verified info; here's what to ask your doctor")
    ).toBeInTheDocument();
  });

  test("Error state displays retry button and retry resends without duplicating in history", async () => {
    sendChatMessage.mockRejectedValueOnce(new Error("Network timeout"));

    render(
      <ChatPanel
        defaultOpen={true}
        profile={mockProfile}
        assessmentResult={mockAssessmentResult}
        lang="en"
      />
    );

    const input = screen.getByLabelText(/Ask assistant a question/i);
    fireEvent.change(input, { target: { value: "network test question" } });
    fireEvent.submit(input.closest("form"));

    // Error notice appears
    const retryBtn = await screen.findByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();
    expect(screen.getByText(/Unable to reach assistant/i)).toBeInTheDocument();

    // User message is in the thread
    const userMessages = screen.getAllByText("network test question");
    expect(userMessages.length).toBe(1);

    // Mock successful retry
    sendChatMessage.mockResolvedValueOnce({
      reply: "Success after retry!",
      route: "deterministic",
    });

    fireEvent.click(retryBtn);

    expect(await screen.findByText("Success after retry!")).toBeInTheDocument();

    // Ensure user message is NOT duplicated in thread
    const userMessagesAfter = screen.getAllByText("network test question");
    expect(userMessagesAfter.length).toBe(1);
    expect(screen.queryByText(/Unable to reach assistant/i)).not.toBeInTheDocument();
  });

  describe("Phase C: Voice STT & TTS Capabilities", () => {
    let originalSR;
    let originalSS;
    let mockInstances = [];

    class MockSpeechRecognition {
      constructor() {
        this.lang = "en-IN";
        this.interimResults = false;
        this.continuous = false;
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
        mockInstances.push(this);
      }
      start = jest.fn(() => {});
      stop = jest.fn(() => {
        if (this.onend) this.onend();
      });
      abort = jest.fn();
    }

    const mockSpeechSynthesis = {
      speak: jest.fn(),
      cancel: jest.fn(),
      getVoices: jest.fn(() => [
        { lang: "en-IN", name: "Google Indian English" },
        { lang: "hi-IN", name: "Google Hindi" },
      ]),
    };

    beforeEach(() => {
      mockInstances = [];
      originalSR = window.SpeechRecognition;
      originalSS = window.speechSynthesis;
      window.SpeechRecognition = MockSpeechRecognition;
      window.speechSynthesis = mockSpeechSynthesis;
      window.SpeechSynthesisUtterance = class MockSpeechSynthesisUtterance {
        constructor(text) {
          this.text = text;
        }
      };
      mockSpeechSynthesis.speak.mockClear();
      mockSpeechSynthesis.cancel.mockClear();
      mockSpeechSynthesis.getVoices = jest.fn(() => [
        { lang: "en-IN", name: "Google Indian English" },
        { lang: "hi-IN", name: "Google Hindi" },
      ]);
    });

    afterEach(() => {
      window.SpeechRecognition = originalSR;
      window.speechSynthesis = originalSS;
      delete window.SpeechSynthesisUtterance;
    });

    test("Mic click prompts consent modal on first use before recording", () => {
      render(
        <ChatPanel
          defaultOpen={true}
          profile={mockProfile}
          assessmentResult={mockAssessmentResult}
          lang="en"
        />
      );

      const micBtn = screen.getByRole("button", { name: /Speak your question/i });
      fireEvent.click(micBtn);

      // Consent modal appears
      expect(screen.getByText(/Voice Input & Privacy/i)).toBeInTheDocument();
      expect(
        screen.getByText(/MahilaSakhi never records or stores your audio or transcripts/i)
      ).toBeInTheDocument();

      // No SpeechRecognition start before consent accepted
      expect(mockInstances.length).toBe(0);

      // Click Accept
      const acceptBtn = screen.getByRole("button", { name: /I Understand & Proceed/i });
      fireEvent.click(acceptBtn);

      // Consent modal closed, recognition started
      expect(screen.queryByText(/Voice Input & Privacy/i)).not.toBeInTheDocument();
      expect(mockInstances.length).toBe(1);
      expect(mockInstances[0].start).toHaveBeenCalled();
    });

    test("Speech transcript populates the input field and is NEVER auto-sent", async () => {
      render(
        <ChatPanel
          defaultOpen={true}
          profile={mockProfile}
          assessmentResult={mockAssessmentResult}
          lang="en"
        />
      );

      // Click mic and accept consent
      fireEvent.click(screen.getByRole("button", { name: /Speak your question/i }));
      fireEvent.click(screen.getByRole("button", { name: /I Understand & Proceed/i }));

      const rec = mockInstances[0];
      expect(rec).toBeDefined();

      // Simulate SpeechRecognition onresult event inside act
      act(() => {
        rec.onresult({
          results: [
            [{ transcript: "should I consult my gynecologist for irregular periods" }],
          ],
        });
      });

      const input = screen.getByLabelText(/Ask assistant a question/i);
      await waitFor(() => {
        expect(input.value).toBe("should I consult my gynecologist for irregular periods");
      });

      // Crucial: sendChatMessage was NOT called automatically
      expect(sendChatMessage).not.toHaveBeenCalled();

      // User manually edits the text
      fireEvent.change(input, {
        target: { value: "should I consult my gynecologist for irregular periods soon?" },
      });
      expect(input.value).toBe("should I consult my gynecologist for irregular periods soon?");

      // User submits manually
      sendChatMessage.mockResolvedValueOnce({
        reply: "Consulting a clinician is recommended.",
        route: "deterministic",
      });
      fireEvent.submit(input.closest("form"));
      expect(sendChatMessage).toHaveBeenCalledTimes(1);
      expect(sendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "should I consult my gynecologist for irregular periods soon?",
        })
      );
    });

    test("Language switch changes recognition language to hi-IN", () => {
      render(
        <ChatPanel
          defaultOpen={true}
          profile={mockProfile}
          assessmentResult={mockAssessmentResult}
          lang="hi"
        />
      );

      const micBtn = screen.getByRole("button", { name: /बोलकर सवाल पूछें/i });
      fireEvent.click(micBtn);
      fireEvent.click(screen.getByRole("button", { name: /मैं समझती हूँ, आगे बढ़ें/i }));

      expect(mockInstances.length).toBe(1);
      expect(mockInstances[0].lang).toBe("hi-IN");
    });

    test("Unsupported browser displays friendly note and text chat keeps working", () => {
      window.SpeechRecognition = undefined;
      window.webkitSpeechRecognition = undefined;

      render(
        <ChatPanel
          defaultOpen={true}
          profile={mockProfile}
          assessmentResult={mockAssessmentResult}
          lang="en"
        />
      );

      const micBtn = screen.getByRole("button", { name: /Speak your question/i });
      fireEvent.click(micBtn);

      // Friendly error notice without technical jargon
      expect(
        screen.getByText(/Voice input is not supported in this browser. You can continue typing./i)
      ).toBeInTheDocument();

      // Text input still works seamlessly
      const input = screen.getByLabelText(/Ask assistant a question/i);
      fireEvent.change(input, { target: { value: "fallback text question" } });
      expect(input.value).toBe("fallback text question");
    });

    test("Listen and Stop buttons trigger speechSynthesis speak and cancel", async () => {
      sendChatMessage.mockResolvedValueOnce({
        reply: "Here is your personalized care plan overview.",
        route: "deterministic",
      });

      render(
        <ChatPanel
          defaultOpen={true}
          profile={mockProfile}
          assessmentResult={mockAssessmentResult}
          lang="en"
        />
      );

      const input = screen.getByLabelText(/Ask assistant a question/i);
      fireEvent.change(input, { target: { value: "overview" } });
      fireEvent.submit(input.closest("form"));

      expect(await screen.findByText(/Here is your personalized care plan overview/i)).toBeInTheDocument();

      // Click Listen
      const listenBtn = screen.getByRole("button", { name: /Listen/i });
      fireEvent.click(listenBtn);

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);

      // Button toggles to Stop
      expect(screen.getByRole("button", { name: /Stop/i })).toBeInTheDocument();

      // Click Stop
      const stopBtn = screen.getByRole("button", { name: /Stop/i });
      fireEvent.click(stopBtn);
      expect(mockSpeechSynthesis.cancel.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});

