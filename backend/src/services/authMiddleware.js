const authService = require("./authService")

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization ?? ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const user = await authService.getProfile(token)
    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

function requireAdmin(req, res, next) {
  const role = req.user?.role
  if (role !== "admin") {
    const error = new Error("Admin access required.")
    error.status = 403
    error.code = "FORBIDDEN"
    return next(error)
  }
  return next()
}

module.exports = {
  requireAuth,
  requireAdmin,
}
