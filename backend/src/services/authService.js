const { randomInt, randomUUID } = require("node:crypto")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { isTwilioConfigured, sendOtpSms } = require("./smsService")
const {
  createPhoneVerification,
  findLatestPhoneVerification,
  markPhoneVerificationVerified,
  consumeVerificationToken,
} = require("../models/phoneVerificationModel")
const {
  createUserSession,
  findActiveSessionByTokenId,
  touchSessionByTokenId,
  listUserSessionsByUserId,
  revokeUserSessionById,
} = require("../models/userSessionModel")
const {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  updateUserProfileById,
  updateUserPasswordById,
  incrementUserTokenVersionById,
} = require("../models/userModel")

const OTP_TTL_MS = 10 * 60 * 1000
const JWT_EXPIRES_IN = "7d"

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw createHttpError(500, "JWT_SECRET is not configured on server.")
  }
  return secret
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    country: user.country,
    proofOfAddress: user.proof_of_address,
    phone: user.phone,
    phoneVerifiedAt: user.phone_verified_at,
    createdAt: user.created_at,
  }
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase()
}

function normalizePhone(phone) {
  const raw = String(phone || "").trim()
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  return `+${digits}`
}

function assertPhoneFormat(phone) {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw createHttpError(400, "Invalid phone number format.")
  }
}

function generateOtpCode() {
  return String(randomInt(100000, 999999))
}

function signToken(user, sessionTokenId) {
  const secret = getJwtSecret()
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tv: Number(user.token_version || 0),
      sid: sessionTokenId,
    },
    secret,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

function getRequestMeta(requestMeta = {}) {
  const ipAddress = String(requestMeta.ipAddress || "").slice(0, 64) || null
  const userAgent = String(requestMeta.userAgent || "").slice(0, 500) || null
  return { ipAddress, userAgent }
}

async function createSessionForUser(user, requestMeta = {}) {
  const sessionTokenId = randomUUID()
  const meta = getRequestMeta(requestMeta)
  await createUserSession({
    id: randomUUID(),
    userId: user.id,
    sessionTokenId,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  })
  return sessionTokenId
}

async function sendPhoneOtp(payload) {
  const phone = normalizePhone(payload?.phone)
  if (!phone) {
    throw createHttpError(400, "Phone number is required.")
  }
  assertPhoneFormat(phone)
  if (process.env.NODE_ENV === "production" && !isTwilioConfigured()) {
    throw createHttpError(500, "Twilio is not configured on server.")
  }

  const existingUser = await findUserByPhone(phone)
  if (existingUser) {
    throw createHttpError(409, "Phone number is already registered.")
  }

  const otp = generateOtpCode()
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

  await createPhoneVerification({
    id: randomUUID(),
    phone,
    otpHash,
    expiresAt,
  })

  const smsResult = await sendOtpSms(phone, otp)
  const response = {
    message: "OTP sent successfully.",
    expiresInSeconds: OTP_TTL_MS / 1000,
  }

  if (smsResult.mode === "twilio") {
    response.delivery = "sms"
  } else if (process.env.NODE_ENV !== "production") {
    response.delivery = "demo"
    response.note = "Twilio not configured. OTP is returned for local testing only."
    response.demoOtp = otp
  }

  return response
}

async function verifyPhoneOtp(payload) {
  const phone = normalizePhone(payload?.phone)
  const otp = String(payload?.otp || "").trim()

  if (!phone || !otp) {
    throw createHttpError(400, "Phone and OTP are required.")
  }
  assertPhoneFormat(phone)

  const verification = await findLatestPhoneVerification(phone)
  if (!verification) {
    throw createHttpError(404, "No OTP request found for this phone number.")
  }
  if (verification.used_at) {
    throw createHttpError(400, "OTP is already used.")
  }
  if (verification.verified_at) {
    return {
      verificationToken: verification.verification_token,
      message: "Phone already verified for this OTP request.",
    }
  }
  if (new Date(verification.expires_at).getTime() <= Date.now()) {
    throw createHttpError(400, "OTP has expired. Please request a new OTP.")
  }

  const isValid = await bcrypt.compare(otp, verification.otp_hash)
  if (!isValid) {
    throw createHttpError(401, "Invalid OTP.")
  }

  const verificationToken = randomUUID()
  const updated = await markPhoneVerificationVerified({
    id: verification.id,
    verificationToken,
    verifiedAt: new Date().toISOString(),
  })

  return {
    verificationToken: updated.verification_token,
    message: "Phone verified successfully.",
  }
}

async function register(payload, requestMeta = {}) {
  const name = String(payload?.name || "").trim()
  const email = normalizeEmail(payload?.email)
  const password = String(payload?.password || "")
  const country = String(payload?.country || "").trim()
  const proofOfAddress = String(payload?.proofOfAddress || "").trim() || null
  const phone = normalizePhone(payload?.phone)
  const phoneVerificationToken = String(payload?.phoneVerificationToken || "").trim()

  if (!name || !email || !password || !country || !phone || !phoneVerificationToken) {
    throw createHttpError(
      400,
      "Name, email, password, country, phone, and phoneVerificationToken are required."
    )
  }
  if (password.length < 6) {
    throw createHttpError(400, "Password must be at least 6 characters.")
  }
  assertPhoneFormat(phone)

  const [existingEmail, existingPhone] = await Promise.all([findUserByEmail(email), findUserByPhone(phone)])
  if (existingEmail) {
    throw createHttpError(409, "Email already registered.")
  }
  if (existingPhone) {
    throw createHttpError(409, "Phone number already registered.")
  }

  const consumedVerification = await consumeVerificationToken({
    phone,
    verificationToken: phoneVerificationToken,
  })
  if (!consumedVerification) {
    throw createHttpError(400, "Phone is not verified or verification token is invalid.")
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await createUser({
    id: randomUUID(),
    name,
    email,
    passwordHash,
    country,
    proofOfAddress,
    phone,
    phoneVerifiedAt: consumedVerification.verified_at,
  })

  const sessionTokenId = await createSessionForUser(user, requestMeta)
  return {
    token: signToken(user, sessionTokenId),
    user: sanitizeUser(user),
  }
}

async function login(payload, requestMeta = {}) {
  const email = normalizeEmail(payload?.email)
  const password = String(payload?.password || "")

  if (!email || !password) {
    throw createHttpError(400, "Email and password are required.")
  }

  const user = await findUserByEmail(email)
  if (!user) {
    throw createHttpError(401, "Invalid email or password.")
  }

  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    throw createHttpError(401, "Invalid email or password.")
  }

  const sessionTokenId = await createSessionForUser(user, requestMeta)
  return {
    token: signToken(user, sessionTokenId),
    user: sanitizeUser(user),
  }
}

async function getProfile(token) {
  if (!token) {
    throw createHttpError(401, "Missing authorization token.")
  }

  let decoded
  try {
    decoded = jwt.verify(token, getJwtSecret())
  } catch {
    throw createHttpError(401, "Invalid or expired token.")
  }

  const user = await findUserById(decoded.sub)
  if (!user) {
    throw createHttpError(404, "User not found.")
  }
  const userTokenVersion = Number(user.token_version || 0)
  const tokenVersion = Number(decoded?.tv || 0)
  if (tokenVersion !== userTokenVersion) {
    throw createHttpError(401, "Session is no longer valid. Please login again.")
  }
  const sessionTokenId = String(decoded?.sid || "")
  if (sessionTokenId) {
    const activeSession = await findActiveSessionByTokenId(sessionTokenId)
    if (!activeSession || activeSession.user_id !== user.id) {
      throw createHttpError(401, "Session is no longer active. Please login again.")
    }
    await touchSessionByTokenId(sessionTokenId)
  }

  return sanitizeUser(user)
}

async function updateProfile(userId, payload) {
  const name = String(payload?.name || "").trim()
  const country = String(payload?.country || "").trim()
  const proofOfAddress = String(payload?.proofOfAddress || "").trim() || null

  if (!userId) {
    throw createHttpError(401, "Unauthorized.")
  }
  if (!name || !country) {
    throw createHttpError(400, "Name and country are required.")
  }

  const updated = await updateUserProfileById({
    id: userId,
    name,
    country,
    proofOfAddress,
  })

  if (!updated) {
    throw createHttpError(404, "User not found.")
  }

  return sanitizeUser(updated)
}

async function changePassword(userId, payload) {
  const currentPassword = String(payload?.currentPassword || "")
  const newPassword = String(payload?.newPassword || "")

  if (!userId) {
    throw createHttpError(401, "Unauthorized.")
  }
  if (!currentPassword || !newPassword) {
    throw createHttpError(400, "Current password and new password are required.")
  }

  const user = await findUserById(userId)
  if (!user) {
    throw createHttpError(404, "User not found.")
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!isValid) {
    throw createHttpError(401, "Current password is incorrect.")
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await updateUserPasswordById({
    id: userId,
    passwordHash,
  })

  return {
    message: "Password updated successfully.",
  }
}

async function logoutAllSessions(userId) {
  if (!userId) {
    throw createHttpError(401, "Unauthorized.")
  }
  const updated = await incrementUserTokenVersionById(userId)
  if (!updated) {
    throw createHttpError(404, "User not found.")
  }
  return {
    message: "Logged out from all devices.",
  }
}

async function getMySessions(userId) {
  if (!userId) {
    throw createHttpError(401, "Unauthorized.")
  }
  const sessions = await listUserSessionsByUserId(userId)
  return sessions.map((item) => ({
    id: item.id,
    sessionTokenId: item.session_token_id,
    userAgent: item.user_agent,
    ipAddress: item.ip_address,
    createdAt: item.created_at,
    lastSeenAt: item.last_seen_at,
    revokedAt: item.revoked_at,
  }))
}

async function revokeMySession(userId, sessionId) {
  if (!userId) {
    throw createHttpError(401, "Unauthorized.")
  }
  const revoked = await revokeUserSessionById({ userId, sessionId })
  if (!revoked) {
    throw createHttpError(404, "Session not found.")
  }
  return {
    message: "Session revoked successfully.",
  }
}

module.exports = {
  sendPhoneOtp,
  verifyPhoneOtp,
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logoutAllSessions,
  getMySessions,
  revokeMySession,
}
