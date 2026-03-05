const { Router } = require("express")
const authController = require("../controllers/authController")

const router = Router()

router.post("/send-otp", authController.sendPhoneOtp)
router.post("/verify-otp", authController.verifyPhoneOtp)
router.post("/register", authController.register)
router.post("/login", authController.login)
router.get("/me", authController.me)

module.exports = router
