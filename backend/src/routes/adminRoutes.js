const { Router } = require("express")
const adminController = require("../controllers/adminController")
const { requireAuth, requireAdmin } = require("../services/authMiddleware")
const { validateAdminUserIdParam, validateAdminUserStatusUpdate } = require("../services/validationMiddleware")

const router = Router()

router.get("/stats", requireAuth, requireAdmin, adminController.getStats)
router.get("/users", requireAuth, requireAdmin, adminController.listUsers)
router.put(
  "/users/:userId/status",
  requireAuth,
  requireAdmin,
  validateAdminUserIdParam,
  validateAdminUserStatusUpdate,
  adminController.updateUserStatus
)

module.exports = router

