const { Router } = require("express")
const tradingController = require("../controllers/tradingController")
const { requireAuth } = require("../services/authMiddleware")

const router = Router()

router.get("/state", requireAuth, tradingController.getState)
router.put("/state", requireAuth, tradingController.saveState)

module.exports = router
