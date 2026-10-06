const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export async function assessProfile(profilePayload) {
  const response = await fetch(`${API_BASE}/v3/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profilePayload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned ${response.status}`);
  }

  return response.json();
}

export async function deleteUserData() {
  const response = await fetch(`${API_BASE}/v3/delete`, {
    method: "DELETE",
  });
  return response.json();
}

export async function sendChatMessage(message, context) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Chat error: ${response.status}`);
  }

  return response.json();
}
