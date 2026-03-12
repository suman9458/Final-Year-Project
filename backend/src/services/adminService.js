const {
  getAdminDashboardStats,
  listUsersForAdmin,
  updateUserBlockedStatusById,
  updateUserKycStatusById,
  incrementUserTokenVersionById,
} = require("../models/userModel")

function createHttpError(status, message, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function sanitizeAdminUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    country: row.country,
    phone: row.phone,
    role: row.role || "user",
    isBlocked: Boolean(row.is_blocked),
    kycStatus: row.kyc_status || "pending",
    proofOfAddress: row.proof_of_address || "",
    phoneVerifiedAt: row.phone_verified_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getAdminStats() {
  const stats = await getAdminDashboardStats()
  return {
    totalUsers: Number(stats.total_users || 0),
    totalAdmins: Number(stats.total_admins || 0),
    totalTraders: Number(stats.total_traders || 0),
    totalBlocked: Number(stats.total_blocked || 0),
  }
}

async function getAllUsers() {
  const rows = await listUsersForAdmin(300)
  return rows.map(sanitizeAdminUser)
}

async function setUserBlockedStatus(payload) {
  const userId = String(payload?.userId || "").trim()
  const isBlocked = Boolean(payload?.isBlocked)
  const actorUserId = String(payload?.actorUserId || "").trim()

  if (!userId) {
    throw createHttpError(400, "userId is required.", "VALIDATION_ERROR")
  }
  if (!actorUserId) {
    throw createHttpError(401, "Unauthorized.", "UNAUTHORIZED")
  }
  if (userId === actorUserId) {
    throw createHttpError(400, "Admin cannot change own blocked status.", "INVALID_OPERATION")
  }

  const updated = await updateUserBlockedStatusById({
    id: userId,
    isBlocked,
  })
  if (!updated) {
    throw createHttpError(404, "User not found.", "NOT_FOUND")
  }

  if (isBlocked) {
    await incrementUserTokenVersionById(userId)
  }

  return sanitizeAdminUser(updated)
}

async function setUserKycStatus(payload) {
  const userId = String(payload?.userId || "").trim()
  const actorUserId = String(payload?.actorUserId || "").trim()
  const kycStatus = String(payload?.kycStatus || "")
    .trim()
    .toLowerCase()

  if (!userId) {
    throw createHttpError(400, "userId is required.", "VALIDATION_ERROR")
  }
  if (!actorUserId) {
    throw createHttpError(401, "Unauthorized.", "UNAUTHORIZED")
  }
  if (!["pending", "approved", "rejected"].includes(kycStatus)) {
    throw createHttpError(400, "Invalid KYC status.", "VALIDATION_ERROR")
  }

  const rows = await listUsersForAdmin(500)
  const targetUser = rows.find((row) => row.id === userId)
  if (!targetUser) {
    throw createHttpError(404, "User not found.", "NOT_FOUND")
  }
  if ((targetUser.role || "user") === "admin") {
    throw createHttpError(400, "Admin KYC status cannot be changed.", "INVALID_OPERATION")
  }

  const updated = await updateUserKycStatusById({
    id: userId,
    kycStatus,
  })
  if (!updated) {
    throw createHttpError(404, "User not found.", "NOT_FOUND")
  }

  return sanitizeAdminUser(updated)
}

module.exports = {
  getAdminStats,
  getAllUsers,
  setUserBlockedStatus,
  setUserKycStatus,
}
