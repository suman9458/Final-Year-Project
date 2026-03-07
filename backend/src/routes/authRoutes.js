const { Router } = require("express")
const authController = require("../controllers/authController")
const { otpSendLimiter, otpVerifyLimiter, loginLimiter, passwordChangeLimiter } = require("../services/rateLimiters")
const { requireAuth } = require("../services/authMiddleware")
const {
  validateSendOtp,
  validateVerifyOtp,
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordUpdate,
  validateSessionIdParam,
} = require("../services/validationMiddleware")

const router = Router()

router.post("/send-otp", otpSendLimiter, validateSendOtp, authController.sendPhoneOtp)
router.post("/verify-otp", otpVerifyLimiter, validateVerifyOtp, authController.verifyPhoneOtp)
router.post("/register", validateRegister, authController.register)
router.post("/login", loginLimiter, validateLogin, authController.login)
router.get("/me", requireAuth, authController.me)
router.get("/me/sessions", requireAuth, authController.mySessions)
router.put("/me/update", requireAuth, validateProfileUpdate, authController.updateMe)
router.put("/me/password", requireAuth, passwordChangeLimiter, validatePasswordUpdate, authController.updateMyPassword)
router.post("/me/logout-all", requireAuth, authController.logoutAllMySessions)
router.delete("/me/sessions/:sessionId", requireAuth, validateSessionIdParam, authController.revokeMySession)

module.exports = router
