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

module.exports = {
  requireAuth,
}
