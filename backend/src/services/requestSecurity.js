const { randomUUID } = require("node:crypto")

function parseAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN || "http://localhost:5173"
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function corsOriginDelegate(origin, callback) {
  const allowedOrigins = parseAllowedOrigins()

  if (!origin) {
    callback(null, true)
    return
  }

  if (allowedOrigins.includes(origin)) {
    callback(null, true)
    return
  }

  const error = new Error("CORS origin not allowed.")
  error.status = 403
  error.code = "CORS_ORIGIN_BLOCKED"
  callback(error)
}

function requestIdMiddleware(req, res, next) {
  req.requestId = randomUUID()
  res.setHeader("X-Request-Id", req.requestId)
  next()
}

function securityHeadersMiddleware(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  next()
}

module.exports = {
  corsOriginDelegate,
  requestIdMiddleware,
  securityHeadersMiddleware,
}
