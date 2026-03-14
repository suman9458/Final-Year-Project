function createHttpError(status, message, code, details) {
  const error = new Error(message)
  error.status = status
  error.code = code
  if (details) error.details = details
  return error
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""))
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "")
  return digits ? `+${digits}` : ""
}

function validateSendOtp(req, res, next) {
  const phone = normalizePhone(req.body?.phone)
  if (!phone) {
    return next(createHttpError(400, "Phone number is required.", "VALIDATION_ERROR"))
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return next(createHttpError(400, "Invalid phone number format.", "VALIDATION_ERROR"))
  }
  req.body.phone = phone
  return next()
}

function validateVerifyOtp(req, res, next) {
  const phone = normalizePhone(req.body?.phone)
  const otp = String(req.body?.otp || "").trim()

  if (!phone || !otp) {
    return next(createHttpError(400, "Phone and OTP are required.", "VALIDATION_ERROR"))
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return next(createHttpError(400, "Invalid phone number format.", "VALIDATION_ERROR"))
  }
  if (!/^\d{4,8}$/.test(otp)) {
    return next(createHttpError(400, "OTP must be a valid numeric code.", "VALIDATION_ERROR"))
  }

  req.body.phone = phone
  req.body.otp = otp
  return next()
}

function validateRegister(req, res, next) {
  const payload = req.body || {}
  const name = String(payload.name || "").trim()
  const email = String(payload.email || "")
    .trim()
    .toLowerCase()
  const password = String(payload.password || "")
  const country = String(payload.country || "").trim()
  const proofOfAddress = String(payload.proofOfAddress || "").trim()
  const phone = normalizePhone(payload.phone)
  const phoneVerificationToken = String(payload.phoneVerificationToken || "").trim()

  if (!name || !email || !password || !country || !phone || !phoneVerificationToken) {
    return next(
      createHttpError(
        400,
        "Name, email, password, country, phone, and phoneVerificationToken are required.",
        "VALIDATION_ERROR"
      )
    )
  }
  if (!isEmail(email)) {
    return next(createHttpError(400, "Invalid email format.", "VALIDATION_ERROR"))
  }
  if (password.length < 6 || password.length > 120) {
    return next(createHttpError(400, "Password must be between 6 and 120 characters.", "VALIDATION_ERROR"))
  }
  if (name.length > 120 || country.length > 120) {
    return next(createHttpError(400, "Name and country must be 120 characters or fewer.", "VALIDATION_ERROR"))
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return next(createHttpError(400, "Invalid phone number format.", "VALIDATION_ERROR"))
  }
  if (proofOfAddress.length > 600) {
    return next(createHttpError(400, "Proof of address is too long.", "VALIDATION_ERROR"))
  }
  if (!/^[0-9a-fA-F-]{20,60}$/.test(phoneVerificationToken)) {
    return next(createHttpError(400, "Invalid phone verification token.", "VALIDATION_ERROR"))
  }

  req.body = {
    name,
    email,
    password,
    country,
    proofOfAddress,
    phone,
    phoneVerificationToken,
  }
  return next()
}

function validateLogin(req, res, next) {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase()
  const password = String(req.body?.password || "")

  if (!email || !password) {
    return next(createHttpError(400, "Email and password are required.", "VALIDATION_ERROR"))
  }
  if (!isEmail(email)) {
    return next(createHttpError(400, "Invalid email format.", "VALIDATION_ERROR"))
  }
  if (password.length > 120) {
    return next(createHttpError(400, "Invalid password length.", "VALIDATION_ERROR"))
  }

  req.body.email = email
  req.body.password = password
  return next()
}

function validateProfileUpdate(req, res, next) {
  const name = String(req.body?.name || "").trim()
  const country = String(req.body?.country || "").trim()
  const proofOfAddress = String(req.body?.proofOfAddress || "").trim()

  if (!name || !country) {
    return next(createHttpError(400, "Name and country are required.", "VALIDATION_ERROR"))
  }
  if (name.length > 120 || country.length > 120) {
    return next(createHttpError(400, "Name and country must be 120 characters or fewer.", "VALIDATION_ERROR"))
  }
  if (proofOfAddress.length > 600) {
    return next(createHttpError(400, "Proof of address is too long.", "VALIDATION_ERROR"))
  }

  req.body = {
    name,
    country,
    proofOfAddress,
  }
  return next()
}

function validatePasswordUpdate(req, res, next) {
  const currentPassword = String(req.body?.currentPassword || "")
  const newPassword = String(req.body?.newPassword || "")
  const confirmNewPassword = String(req.body?.confirmNewPassword || "")

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return next(createHttpError(400, "currentPassword, newPassword and confirmNewPassword are required.", "VALIDATION_ERROR"))
  }
  if (newPassword.length < 6 || newPassword.length > 120) {
    return next(createHttpError(400, "New password must be between 6 and 120 characters.", "VALIDATION_ERROR"))
  }
  if (newPassword !== confirmNewPassword) {
    return next(createHttpError(400, "New password and confirmation do not match.", "VALIDATION_ERROR"))
  }
  if (currentPassword === newPassword) {
    return next(createHttpError(400, "New password must be different from current password.", "VALIDATION_ERROR"))
  }

  req.body = {
    currentPassword,
    newPassword,
    confirmNewPassword,
  }
  return next()
}

function validateTradingStatePayload(req, res, next) {
  const state = req.body?.state
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return next(createHttpError(400, "state must be a valid object.", "VALIDATION_ERROR"))
  }

  let payloadSize = 0
  try {
    payloadSize = Buffer.byteLength(JSON.stringify(state), "utf8")
  } catch {
    return next(createHttpError(400, "state must be serializable JSON.", "VALIDATION_ERROR"))
  }

  if (payloadSize > 100_000) {
    return next(createHttpError(413, "state payload is too large.", "PAYLOAD_TOO_LARGE"))
  }

  return next()
}

function validateSessionIdParam(req, res, next) {
  const sessionId = String(req.params?.sessionId || "").trim()
  if (!/^[0-9a-fA-F-]{36}$/.test(sessionId)) {
    return next(createHttpError(400, "Invalid session id.", "VALIDATION_ERROR"))
  }
  req.params.sessionId = sessionId
  return next()
}

function validateAdminUserIdParam(req, res, next) {
  const userId = String(req.params?.userId || "").trim()
  if (!/^[0-9a-fA-F-]{36}$/.test(userId)) {
    return next(createHttpError(400, "Invalid user id.", "VALIDATION_ERROR"))
  }
  req.params.userId = userId
  return next()
}

function validateAdminUserStatusUpdate(req, res, next) {
  if (typeof req.body?.isBlocked !== "boolean") {
    return next(createHttpError(400, "isBlocked must be boolean.", "VALIDATION_ERROR"))
  }
  return next()
}

function validateAdminUserKycUpdate(req, res, next) {
  const kycStatus = String(req.body?.kycStatus || "")
    .trim()
    .toLowerCase()
  if (!["pending", "approved", "rejected"].includes(kycStatus)) {
    return next(createHttpError(400, "kycStatus must be one of pending, approved, rejected.", "VALIDATION_ERROR"))
  }
  req.body.kycStatus = kycStatus
  return next()
}

function validateWalletRequestCreate(req, res, next) {
  const requestType = String(req.body?.requestType || "")
    .trim()
    .toLowerCase()
  const amount = Number(req.body?.amount)
  const note = String(req.body?.note || "").trim()

  if (!["deposit", "withdraw"].includes(requestType)) {
    return next(createHttpError(400, "requestType must be deposit or withdraw.", "VALIDATION_ERROR"))
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return next(createHttpError(400, "amount must be a positive number.", "VALIDATION_ERROR"))
  }
  if (note.length > 300) {
    return next(createHttpError(400, "note is too long.", "VALIDATION_ERROR"))
  }

  req.body.requestType = requestType
  req.body.amount = Number(amount.toFixed(2))
  req.body.note = note
  return next()
}

function validateJournalAttachmentUpload(req, res, next) {
  const fileName = String(req.body?.fileName || "").trim()
  const contentType = String(req.body?.contentType || "")
    .trim()
    .toLowerCase()
  const dataUrl = String(req.body?.dataUrl || "").trim()

  if (!fileName || !contentType || !dataUrl) {
    return next(createHttpError(400, "fileName, contentType, and dataUrl are required.", "VALIDATION_ERROR"))
  }
  if (fileName.length > 180) {
    return next(createHttpError(400, "fileName is too long.", "VALIDATION_ERROR"))
  }
  if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(contentType)) {
    return next(createHttpError(400, "Unsupported image type.", "VALIDATION_ERROR"))
  }
  if (!dataUrl.startsWith(`data:${contentType};base64,`)) {
    return next(createHttpError(400, "Invalid image data format.", "VALIDATION_ERROR"))
  }
  if (dataUrl.length > 2_900_000) {
    return next(createHttpError(413, "Image payload is too large.", "PAYLOAD_TOO_LARGE"))
  }

  req.body.fileName = fileName
  req.body.contentType = contentType
  req.body.dataUrl = dataUrl
  return next()
}

function validateWalletRequestIdParam(req, res, next) {
  const requestId = String(req.params?.requestId || "").trim()
  if (!/^[0-9a-fA-F-]{36}$/.test(requestId)) {
    return next(createHttpError(400, "Invalid wallet request id.", "VALIDATION_ERROR"))
  }
  req.params.requestId = requestId
  return next()
}

function validateAdminWalletRequestStatusUpdate(req, res, next) {
  const status = String(req.body?.status || "")
    .trim()
    .toLowerCase()
  const reviewNote = String(req.body?.reviewNote || "").trim()

  if (!["approved", "rejected"].includes(status)) {
    return next(createHttpError(400, "status must be approved or rejected.", "VALIDATION_ERROR"))
  }
  if (reviewNote.length > 300) {
    return next(createHttpError(400, "reviewNote is too long.", "VALIDATION_ERROR"))
  }

  req.body.status = status
  req.body.reviewNote = reviewNote
  return next()
}

module.exports = {
  validateSendOtp,
  validateVerifyOtp,
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordUpdate,
  validateSessionIdParam,
  validateAdminUserIdParam,
  validateAdminUserStatusUpdate,
  validateAdminUserKycUpdate,
  validateWalletRequestCreate,
  validateJournalAttachmentUpload,
  validateWalletRequestIdParam,
  validateAdminWalletRequestStatusUpdate,
  validateTradingStatePayload,
}
