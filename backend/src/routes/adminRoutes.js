const { Router } = require("express")
const adminController = require("../controllers/adminController")
const { requireAuth, requireAdmin } = require("../services/authMiddleware")
const {
  validateAdminUserIdParam,
  validateAdminUserStatusUpdate,
  validateAdminUserKycUpdate,
  validateWalletRequestIdParam,
  validateAdminWalletRequestStatusUpdate,
} = require("../services/validationMiddleware")

const router = Router()

router.get("/stats", requireAuth, requireAdmin, adminController.getStats)
router.get("/users", requireAuth, requireAdmin, adminController.listUsers)
router.get("/wallet/requests", requireAuth, requireAdmin, adminController.listWalletRequests)
router.put(
  "/users/:userId/status",
  requireAuth,
  requireAdmin,
  validateAdminUserIdParam,
  validateAdminUserStatusUpdate,
  adminController.updateUserStatus
)
router.put(
  "/wallet/requests/:requestId/status",
  requireAuth,
  requireAdmin,
  validateWalletRequestIdParam,
  validateAdminWalletRequestStatusUpdate,
  adminController.updateWalletRequest
)
router.put(
  "/users/:userId/kyc",
  requireAuth,
  requireAdmin,
  validateAdminUserIdParam,
  validateAdminUserKycUpdate,
  adminController.updateUserKyc
)

module.exports = router
