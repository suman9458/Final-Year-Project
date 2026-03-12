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
    const error = new Error("Admin API not available in local demo session.")
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
    throw error
  }
  return data
}

export async function fetchAdminStats() {
  const response = await request("/admin/stats", { method: "GET" })
  return response?.stats || null
}

export async function fetchAdminUsers() {
  const response = await request("/admin/users", { method: "GET" })
  return Array.isArray(response?.users) ? response.users : []
}

export async function updateUserBlockedStatus(userId, isBlocked) {
  const response = await request(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: "PUT",
    body: JSON.stringify({ isBlocked }),
  })
  return response?.user || null
}

export async function updateUserKycStatus(userId, kycStatus) {
  const response = await request(`/admin/users/${encodeURIComponent(userId)}/kyc`, {
    method: "PUT",
    body: JSON.stringify({ kycStatus }),
  })
  return response?.user || null
}

export async function fetchAdminWalletRequests() {
  const response = await request("/admin/wallet/requests", { method: "GET" })
  return Array.isArray(response?.requests) ? response.requests : []
}

export async function updateAdminWalletRequestStatus(requestId, payload) {
  const response = await request(`/admin/wallet/requests/${encodeURIComponent(requestId)}/status`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return response?.request || null
}
