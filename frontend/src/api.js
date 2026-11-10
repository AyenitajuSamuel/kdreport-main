const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

function csrfToken() {
  const entry = document.cookie.split("; ").find((cookie) => cookie.startsWith("csrftoken="));
  return entry ? decodeURIComponent(entry.slice("csrftoken=".length)) : "";
}

async function responseData(response) {
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { detail: raw || "The server returned an unreadable response." };
  }
  if (!response.ok) {
    const details = data && typeof data === "object"
      ? Object.entries(data)
          .filter(([key]) => key !== "detail")
          .flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map((item) => `${key}: ${item}`))
          .join(" ")
      : "";
    const message = [data?.detail || `Request failed (${response.status}).`, details].filter(Boolean).join(" ");
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function request(path, { method = "GET", data, signal } = {}) {
  const upperMethod = method.toUpperCase();
  const headers = { Accept: "application/json" };
  const options = { method: upperMethod, credentials: "same-origin", headers, signal };
  if (data !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(data);
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(upperMethod)) {
    headers["X-CSRFToken"] = csrfToken();
  }
  return responseData(await fetch(`${API_BASE}${path}`, options));
}

export async function ensureCsrf() {
  return request("/auth/csrf/");
}

export async function login(username, password) {
  await ensureCsrf();
  return request("/auth/login/", { method: "POST", data: { username, password } });
}

export async function logout() {
  await ensureCsrf();
  return request("/auth/logout/", { method: "POST", data: {} });
}

export async function getCurrentUser() {
  await ensureCsrf();
  return request("/auth/me/");
}

export function apiPath(path) {
  return `${API_BASE}${path}`;
}
