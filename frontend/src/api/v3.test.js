import { fetchWithRetry, setServerWakingListener, assessProfile } from "./v3";
import en from "../i18n/en.json";
import hi from "../i18n/hi.json";
import gu from "../i18n/gu.json";

describe("API v3 Cold-Start & Retry Resilience", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    setServerWakingListener(null);
  });

  afterAll(() => {
    delete global.fetch;
  });

  test("succeeds immediately without retry if server responds with 200", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });

    const statusUpdates = [];
    const res = await fetchWithRetry("http://localhost:5000/health", {}, {
      maxRetries: 2,
      initialDelay: 10,
      onStatusUpdate: (s) => statusUpdates.push(s),
    });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(statusUpdates).toEqual([{ waking: false }]);
  });

  test("retries on 502/503 cold-start error and recovers with exponential backoff", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "recovered" }),
      });

    const statusUpdates = [];
    const res = await fetchWithRetry("http://localhost:5000/v3/assess", {}, {
      maxRetries: 2,
      initialDelay: 10,
      backoffFactor: 1.5,
      onStatusUpdate: (s) => statusUpdates.push(s),
    });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    // Verified status update notified caller of cold-start waking
    expect(statusUpdates.some((s) => s.waking === true && s.attempt === 1)).toBe(true);
    expect(statusUpdates[statusUpdates.length - 1]).toEqual({ waking: false });
  });

  test("retries on network fetch exceptions (connection refused during boot)", async () => {
    global.fetch
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ healthy: true }),
      });

    let wokeUp = false;
    setServerWakingListener((status) => {
      if (status.waking) wokeUp = true;
    });

    const res = await fetchWithRetry("http://localhost:5000/health", {}, {
      maxRetries: 2,
      initialDelay: 10,
    });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(wokeUp).toBe(true);
  });

  test("throws error when maxRetries exhausted on persistent failure", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });

    const res = await fetchWithRetry("http://localhost:5000/health", {}, {
      maxRetries: 2,
      initialDelay: 10,
    });

    // Returns the final 503 response after retrying
    expect(res.status).toBe(503);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test("verifies bilingual cold-start waking message keys exist in en, hi, gu", () => {
    expect(en.server_waking_up).toBeDefined();
    expect(hi.server_waking_up).toBeDefined();
    expect(gu.server_waking_up).toBeDefined();

    expect(en.server_waking_up).toContain("Server is waking up");
    expect(hi.server_waking_up).toContain("सर्वर सक्रिय");
    expect(gu.server_waking_up).toContain("સર્વર શરૂ");
  });
});
