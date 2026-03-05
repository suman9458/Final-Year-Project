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
    const session = await authService.register(req.body)
    res.status(201).json(session)
  } catch (error) {
    next(error)
  }
}

async function login(req, res, next) {
  try {
    const session = await authService.login(req.body)
    res.status(200).json(session)
  } catch (error) {
    next(error)
  }
}

async function me(req, res, next) {
  try {
    const authHeader = req.headers.authorization ?? ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const user = await authService.getProfile(token)
    res.status(200).json({ user })
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
}
