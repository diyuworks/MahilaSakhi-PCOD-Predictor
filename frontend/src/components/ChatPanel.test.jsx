import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
});
