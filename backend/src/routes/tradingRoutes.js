const { Router } = require("express")
const tradingController = require("../controllers/tradingController")
const { requireAuth } = require("../services/authMiddleware")
const { tradingStateLimiter } = require("../services/rateLimiters")
const { validateTradingStatePayload, validateWalletRequestCreate } = require("../services/validationMiddleware")

const router = Router()

router.get("/state", requireAuth, tradingController.getState)
router.put("/state", requireAuth, tradingStateLimiter, validateTradingStatePayload, tradingController.saveState)
router.get("/wallet/requests", requireAuth, tradingController.listMyWalletRequests)
router.post("/wallet/requests", requireAuth, tradingStateLimiter, validateWalletRequestCreate, tradingController.createWalletRequest)

module.exports = router
