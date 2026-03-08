const {
  getAdminDashboardStats,
  listUsersForAdmin,
  updateUserBlockedStatusById,
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

module.exports = {
  getAdminStats,
  getAllUsers,
  setUserBlockedStatus,
}

