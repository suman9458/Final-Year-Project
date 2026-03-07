const authService = require("../services/authService")

async function sendPhoneOtp(req, res, next) {
  try {
    const response = await authService.sendPhoneOtp(req.body)
    res.status(200).json(response)
  } catch (error) {
    next(error)
  }
}

async function verifyPhoneOtp(req, res, next) {
  try {
    const response = await authService.verifyPhoneOtp(req.body)
    res.status(200).json(response)
  } catch (error) {
    next(error)
  }
}

async function register(req, res, next) {
  try {
    const session = await authService.register(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    })
    res.status(201).json(session)
  } catch (error) {
    next(error)
  }
}

async function login(req, res, next) {
  try {
    const session = await authService.login(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    })
    res.status(200).json(session)
  } catch (error) {
    next(error)
  }
}

async function me(req, res, next) {
  try {
    const user = req.user
    res.status(200).json({ user })
  } catch (error) {
    next(error)
  }
}

async function updateMe(req, res, next) {
  try {
    const userId = req.user?.id
    const user = await authService.updateProfile(userId, req.body)
    res.status(200).json({ user })
  } catch (error) {
    next(error)
  }
}

async function updateMyPassword(req, res, next) {
  try {
    const userId = req.user?.id
    const response = await authService.changePassword(userId, req.body)
    res.status(200).json(response)
  } catch (error) {
    next(error)
  }
}

async function logoutAllMySessions(req, res, next) {
  try {
    const userId = req.user?.id
    const response = await authService.logoutAllSessions(userId)
    res.status(200).json(response)
  } catch (error) {
    next(error)
  }
}

async function mySessions(req, res, next) {
  try {
    const userId = req.user?.id
    const sessions = await authService.getMySessions(userId)
    res.status(200).json({ sessions })
  } catch (error) {
    next(error)
  }
}

async function revokeMySession(req, res, next) {
  try {
    const userId = req.user?.id
    const sessionId = String(req.params?.sessionId || "").trim()
    const response = await authService.revokeMySession(userId, sessionId)
    res.status(200).json(response)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  sendPhoneOtp,
  verifyPhoneOtp,
  register,
  login,
  me,
  updateMe,
  updateMyPassword,
  logoutAllMySessions,
  mySessions,
  revokeMySession,
}
