const buckets = new Map()
let requestCounter = 0

function createHttpError(status, message, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim()
  }
  return req.ip || req.socket?.remoteAddress || "unknown"
}

function pruneExpiredBuckets(now) {
  for (const [key, record] of buckets.entries()) {
    if (!record || record.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

function createRateLimiter(options) {
  const windowMs = Number(options?.windowMs) || 60_000
  const max = Number(options?.max) || 60
  const message = options?.message || "Too many requests. Please try again later."
  const code = options?.code || "RATE_LIMITED"
  const keyPrefix = options?.keyPrefix || "default"
  const keyGenerator = typeof options?.keyGenerator === "function" ? options.keyGenerator : (req) => getClientIp(req)

  return function rateLimiter(req, res, next) {
    const now = Date.now()
    requestCounter += 1
    if (requestCounter % 200 === 0) {
      pruneExpiredBuckets(now)
    }

    const scopeKey = `${keyPrefix}:${String(keyGenerator(req) || "anonymous")}`
    const existing = buckets.get(scopeKey)

    if (!existing || existing.resetAt <= now) {
      const fresh = {
        count: 1,
        resetAt: now + windowMs,
      }
      buckets.set(scopeKey, fresh)
      res.setHeader("X-RateLimit-Limit", String(max))
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - fresh.count)))
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(fresh.resetAt / 1000)))
      return next()
    }

    existing.count += 1
    res.setHeader("X-RateLimit-Limit", String(max))
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - existing.count)))
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(existing.resetAt / 1000)))

    if (existing.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
      res.setHeader("Retry-After", String(retryAfterSeconds))
      return next(createHttpError(429, message, code))
    }

    return next()
  }
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "")
  return digits ? `+${digits}` : ""
}

const otpSendLimiter = createRateLimiter({
  keyPrefix: "auth:otp:send",
  windowMs: 10 * 60 * 1000,
  max: 5,
  code: "OTP_SEND_RATE_LIMIT",
  message: "Too many OTP requests. Please wait before requesting again.",
  keyGenerator: (req) => `${getClientIp(req)}:${normalizePhone(req.body?.phone)}`,
})

const otpVerifyLimiter = createRateLimiter({
  keyPrefix: "auth:otp:verify",
  windowMs: 10 * 60 * 1000,
  max: 10,
  code: "OTP_VERIFY_RATE_LIMIT",
  message: "Too many OTP verification attempts. Please try again later.",
  keyGenerator: (req) => `${getClientIp(req)}:${normalizePhone(req.body?.phone)}`,
})

const loginLimiter = createRateLimiter({
  keyPrefix: "auth:login",
  windowMs: 15 * 60 * 1000,
  max: 10,
  code: "LOGIN_RATE_LIMIT",
  message: "Too many login attempts. Please wait before trying again.",
  keyGenerator: (req) => `${getClientIp(req)}:${normalizeEmail(req.body?.email)}`,
})

const passwordChangeLimiter = createRateLimiter({
  keyPrefix: "auth:password:update",
  windowMs: 15 * 60 * 1000,
  max: 5,
  code: "PASSWORD_UPDATE_RATE_LIMIT",
  message: "Too many password update attempts. Please try again later.",
  keyGenerator: (req) => `${getClientIp(req)}:${req.user?.id || "anonymous"}`,
})

const tradingStateLimiter = createRateLimiter({
  keyPrefix: "trading:state",
  windowMs: 60 * 1000,
  max: 60,
  code: "TRADING_RATE_LIMIT",
  message: "Too many state updates. Please slow down.",
  keyGenerator: (req) => `${getClientIp(req)}:${req.user?.id || "anonymous"}`,
})

module.exports = {
  createRateLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
  passwordChangeLimiter,
  tradingStateLimiter,
}
