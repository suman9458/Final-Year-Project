const adminService = require("../services/adminService")
const walletService = require("../services/walletService")

async function getStats(req, res, next) {
  try {
    const stats = await adminService.getAdminStats()
    res.status(200).json({ stats })
  } catch (error) {
    next(error)
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await adminService.getAllUsers()
    res.status(200).json({ users })
  } catch (error) {
    next(error)
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const user = await adminService.setUserBlockedStatus({
      userId: req.params.userId,
      actorUserId: req.user?.id,
      isBlocked: req.body?.isBlocked,
    })
    res.status(200).json({ user })
  } catch (error) {
    next(error)
  }
}

async function updateUserKyc(req, res, next) {
  try {
    const user = await adminService.setUserKycStatus({
      userId: req.params.userId,
      actorUserId: req.user?.id,
      kycStatus: req.body?.kycStatus,
    })
    res.status(200).json({ user })
  } catch (error) {
    next(error)
  }
}

async function listWalletRequests(req, res, next) {
  try {
    const requests = await walletService.getAdminWalletRequests()
    res.status(200).json({ requests })
  } catch (error) {
    next(error)
  }
}

async function updateWalletRequest(req, res, next) {
  try {
    const request = await walletService.setWalletRequestStatus({
      requestId: req.params.requestId,
      reviewerId: req.user?.id,
      status: req.body?.status,
      reviewNote: req.body?.reviewNote,
    })
    res.status(200).json({ request })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getStats,
  listUsers,
  updateUserStatus,
  updateUserKyc,
  listWalletRequests,
  updateWalletRequest,
}
