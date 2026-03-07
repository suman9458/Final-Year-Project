import { getSession } from "./authService"

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"

async function request(path, options = {}) {
  const session = getSession()
  const token = session?.token

  if (!token) {
    const error = new Error("Missing session token.")
    error.code = "NO_SESSION"
    throw error
  }
  if (String(token).startsWith("demo-")) {
    const error = new Error("Local demo session. Skip backend sync.")
    error.code = "LOCAL_SESSION"
    throw error
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    })
  } catch {
    const error = new Error("Backend unreachable.")
    error.code = "NETWORK_ERROR"
    throw error
  }

  const data = await response.json()
  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : data?.error?.message || data?.message || "Request failed."
    const error = new Error(message)
    error.status = response.status
    if (data?.error?.code) {
      error.code = data.error.code
    }
    throw error
  }
  return data
}

export async function fetchTradingState() {
  const response = await request("/trading/state", { method: "GET" })
  return response?.state || null
}

export async function saveTradingState(state) {
  const response = await request("/trading/state", {
    method: "PUT",
    body: JSON.stringify({ state }),
  })
  return response?.state || null
}
