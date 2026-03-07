const USERS_STORAGE_KEY = "miniTradeUsers"
const SESSION_STORAGE_KEY = "miniTradeSession"
const OTP_STORAGE_KEY = "miniTradePhoneOtp"
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"

function readUsers() {
  const usersRaw = localStorage.getItem(USERS_STORAGE_KEY)
  if (!usersRaw) return []

  try {
    return JSON.parse(usersRaw)
  } catch {
    return []
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

function writeSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

function readOtpRecords() {
  const raw = localStorage.getItem(OTP_STORAGE_KEY)
  if (!raw) return {}

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writeOtpRecords(records) {
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(records))
}

async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    })
  } catch {
    const error = new Error("Backend unreachable. Using local demo mode.")
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

function createLocalSession(user) {
  return {
    token: `demo-${Date.now()}`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      country: user.country,
      phone: user.phone,
      proofOfAddress: user.proofOfAddress ?? null,
    },
  }
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "")
  return digits ? `+${digits}` : ""
}

export function getSession() {
  const sessionRaw = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!sessionRaw) return null

  try {
    return JSON.parse(sessionRaw)
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".")
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function updateSessionUser(nextUser) {
  const current = getSession()
  if (!current?.token) return null
  const updated = {
    ...current,
    user: {
      ...current.user,
      ...nextUser,
    },
  }
  writeSession(updated)
  return updated
}

export function getCurrentSessionTokenId() {
  const session = getSession()
  const payload = decodeJwtPayload(session?.token)
  return typeof payload?.sid === "string" ? payload.sid : null
}

function registerUserLocal(payload) {
  const { name, email, password, country, proofOfAddress, phone, phoneVerificationToken } = payload
  if (!name?.trim() || !email?.trim() || !password || !country?.trim() || !phone || !phoneVerificationToken) {
    throw new Error("Missing required registration fields.")
  }

  const users = readUsers()

  const exists = users.find((user) => user.email.toLowerCase() === email.toLowerCase())
  if (exists) {
    throw new Error("Email already registered.")
  }
  const normalizedPhone = normalizePhone(phone)
  const phoneExists = users.find((user) => user.phone === normalizedPhone)
  if (phoneExists) {
    throw new Error("Phone number already registered.")
  }

  const otpRecords = readOtpRecords()
  const otpRecord = otpRecords[normalizedPhone]
  if (!otpRecord || otpRecord.verificationToken !== phoneVerificationToken) {
    throw new Error("Phone is not verified.")
  }

  const newUser = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    country: country.trim(),
    proofOfAddress: proofOfAddress?.trim() || null,
    phone: normalizedPhone,
    phoneVerifiedAt: new Date().toISOString(),
  }

  users.push(newUser)
  writeUsers(users)
  const session = createLocalSession(newUser)
  writeSession(session)
  return session
}

function loginUserLocal(payload) {
  const { email, password } = payload
  const users = readUsers()

  const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase())
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password.")
  }

  const session = createLocalSession(user)
  writeSession(session)
  return session
}

export async function registerUser(payload) {
  try {
    const session = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    writeSession(session)
    return session
  } catch (error) {
    if (error.code === "NETWORK_ERROR") {
      return registerUserLocal(payload)
    }
    throw error
  }
}

export async function loginUser(payload) {
  try {
    const session = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    writeSession(session)
    return session
  } catch (error) {
    if (error.code === "NETWORK_ERROR") {
      return loginUserLocal(payload)
    }
    throw error
  }
}

export async function sendPhoneOtp(phone) {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    throw new Error("Phone number is required.")
  }

  try {
    return await request("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone: normalizedPhone }),
    })
  } catch (error) {
    if (error.code === "NETWORK_ERROR") {
      const records = readOtpRecords()
      const demoOtp = String(Math.floor(100000 + Math.random() * 900000))
      records[normalizedPhone] = {
        otp: demoOtp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        verificationToken: null,
      }
      writeOtpRecords(records)
      return {
        message: "OTP sent in local mode.",
        demoOtp,
        expiresInSeconds: 600,
      }
    }
    throw error
  }
}

export async function verifyPhoneOtp(payload) {
  const normalizedPhone = normalizePhone(payload?.phone)
  const otp = String(payload?.otp || "").trim()
  if (!normalizedPhone || !otp) {
    throw new Error("Phone and OTP are required.")
  }

  try {
    return await request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone: normalizedPhone, otp }),
    })
  } catch (error) {
    if (error.code === "NETWORK_ERROR") {
      const records = readOtpRecords()
      const otpRecord = records[normalizedPhone]
      if (!otpRecord) {
        throw new Error("No OTP request found for this phone.")
      }
      if (Date.now() > otpRecord.expiresAt) {
        throw new Error("OTP has expired. Request a new OTP.")
      }
      if (otpRecord.otp !== otp) {
        throw new Error("Invalid OTP.")
      }

      const verificationToken = crypto.randomUUID()
      records[normalizedPhone] = {
        ...otpRecord,
        verificationToken,
      }
      writeOtpRecords(records)
      return {
        verificationToken,
        message: "Phone verified in local mode.",
      }
    }
    throw error
  }
}

export async function updateProfile(payload) {
  const session = getSession()
  const token = session?.token
  if (!token) {
    throw new Error("Missing session token.")
  }

  if (String(token).startsWith("demo-")) {
    const users = readUsers()
    const userIdx = users.findIndex((item) => item.id === session?.user?.id)
    if (userIdx >= 0) {
      users[userIdx] = {
        ...users[userIdx],
        name: payload?.name?.trim() || users[userIdx].name,
        country: payload?.country?.trim() || users[userIdx].country,
        proofOfAddress: payload?.proofOfAddress?.trim() || null,
      }
      writeUsers(users)
      const updatedSession = updateSessionUser({
        name: users[userIdx].name,
        country: users[userIdx].country,
        proofOfAddress: users[userIdx].proofOfAddress,
      })
      return updatedSession?.user || null
    }
    throw new Error("User not found in local mode.")
  }

  const response = await request("/auth/me/update", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: String(payload?.name || "").trim(),
      country: String(payload?.country || "").trim(),
      proofOfAddress: String(payload?.proofOfAddress || "").trim(),
    }),
  })

  const user = response?.user || null
  if (!user) {
    throw new Error("Invalid profile response.")
  }
  updateSessionUser(user)
  return user
}

export async function changePassword(payload) {
  const session = getSession()
  const token = session?.token
  if (!token) {
    throw new Error("Missing session token.")
  }

  if (String(token).startsWith("demo-")) {
    const users = readUsers()
    const userIdx = users.findIndex((item) => item.id === session?.user?.id)
    if (userIdx < 0) {
      throw new Error("User not found in local mode.")
    }
    if (users[userIdx].password !== String(payload?.currentPassword || "")) {
      throw new Error("Current password is incorrect.")
    }
    users[userIdx].password = String(payload?.newPassword || "")
    writeUsers(users)
    return { message: "Password updated successfully." }
  }

  return request("/auth/me/password", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword: String(payload?.currentPassword || ""),
      newPassword: String(payload?.newPassword || ""),
      confirmNewPassword: String(payload?.confirmNewPassword || ""),
    }),
  })
}

export async function logoutAllSessions() {
  const session = getSession()
  const token = session?.token
  if (!token) {
    throw new Error("Missing session token.")
  }

  if (String(token).startsWith("demo-")) {
    return { message: "Logged out from all devices." }
  }

  return request("/auth/me/logout-all", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchMySessions() {
  const session = getSession()
  const token = session?.token
  if (!token) {
    throw new Error("Missing session token.")
  }

  if (String(token).startsWith("demo-")) {
    return [
      {
        id: "local-demo-session",
        sessionTokenId: "demo-session-token",
        userAgent: navigator.userAgent,
        ipAddress: "127.0.0.1",
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        revokedAt: null,
      },
    ]
  }

  const response = await request("/auth/me/sessions", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return Array.isArray(response?.sessions) ? response.sessions : []
}

export async function revokeMySession(sessionId) {
  const session = getSession()
  const token = session?.token
  if (!token) {
    throw new Error("Missing session token.")
  }

  if (String(token).startsWith("demo-")) {
    return { message: "Session revoked successfully." }
  }

  return request(`/auth/me/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
