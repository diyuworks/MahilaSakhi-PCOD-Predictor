const API_BASE = process.env.REACT_APP_API_URL !== undefined ? process.env.REACT_APP_API_URL : (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

let _globalWakingListener = null;

/**
 * Register a global listener for server cold-start / wake-up status.
 * @param {Function|null} listener ({ waking: boolean, attempt?: number, maxRetries?: number }) => void
 */
export function setServerWakingListener(listener) {
  _globalWakingListener = listener;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches a resource with retry and exponential backoff for Render cold starts.
 * Detects HTTP 502/503/504 gateway errors and fetch network exceptions.
 */
export async function fetchWithRetry(url, options = {}, retryConfig = {}) {
  const maxRetries = retryConfig.maxRetries ?? 3;
  const initialDelay = retryConfig.initialDelay ?? 1500;
  const backoffFactor = retryConfig.backoffFactor ?? 2;
  const onStatusUpdate = retryConfig.onStatusUpdate || _globalWakingListener;

  let attempt = 0;
  let delay = initialDelay;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);

      // On Render free tier, sleeping containers initially return 502/503/504
      if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
        attempt++;
        if (onStatusUpdate) {
          onStatusUpdate({
            waking: true,
            attempt,
            maxRetries,
            status: response.status,
            message: "Server is waking up. Retrying...",
          });
        }
        await sleep(delay);
        delay *= backoffFactor;
        continue;
      }

      if (onStatusUpdate) {
        onStatusUpdate({ waking: false });
      }
      return response;
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        if (onStatusUpdate) {
          onStatusUpdate({
            waking: true,
            attempt,
            maxRetries,
            error: err.message,
            message: "Server is waking up. Retrying connection...",
          });
        }
        await sleep(delay);
        delay *= backoffFactor;
        continue;
      }
      if (onStatusUpdate) {
        onStatusUpdate({ waking: false });
      }
      throw err;
    }
  }
}

export async function assessProfile(profilePayload, retryOptions = {}) {
  const response = await fetchWithRetry(`${API_BASE}/v3/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profilePayload),
  }, retryOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned ${response.status}`);
  }

  return response.json();
}

export async function deleteUserData(retryOptions = {}) {
  const response = await fetchWithRetry(`${API_BASE}/v3/delete`, {
    method: "DELETE",
  }, retryOptions);
  return response.json();
}

export async function sendChatMessage(payloadOrMessage, profile, lang = "en", history = [], retryOptions = {}) {
  let body;
  if (typeof payloadOrMessage === "object" && payloadOrMessage !== null) {
    body = {
      message: payloadOrMessage.message,
      profile: payloadOrMessage.profile,
      lang: payloadOrMessage.lang || "en",
      history: payloadOrMessage.history || [],
    };
  } else {
    body = {
      message: payloadOrMessage,
      profile: profile || {},
      lang: lang || "en",
      history: history || [],
    };
  }

  const response = await fetchWithRetry(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, retryOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Chat error: ${response.status}`);
  }

  return response.json();
}

export async function downloadVisitPrepPdf(result, profile, retryOptions = {}) {
  const response = await fetchWithRetry(`${API_BASE}/v3/visit-prep-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result, profile }),
  }, retryOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `PDF generation failed: ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `MahilaSakhi_Visit_Prep_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}
