const { randomUUID } = require("node:crypto")
const {
  createWalletRequest,
  listWalletRequestsByUserId,
  listWalletRequestsForAdmin,
  updateWalletRequestStatus,
  findWalletRequestById,
} = require("../models/walletRequestModel")

function createHttpError(status, message, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function sanitizeWalletRequest(row) {
  return {
    id: row.id,
    userId: row.user_id,
    requestType: row.request_type,
    amount: Number(row.amount || 0),
    status: row.status,
    note: row.note || "",
    reviewNote: row.review_note || "",
    reviewedBy: row.reviewed_by || null,
    reviewedByEmail: row.reviewer_email || null,
    reviewedAt: row.reviewed_at || null,
    requesterName: row.requester_name || null,
    requesterEmail: row.requester_email || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function submitWalletRequest(payload) {
  const userId = String(payload?.userId || "").trim()
  const requestType = String(payload?.requestType || "")
    .trim()
    .toLowerCase()
  const amount = Number(payload?.amount)
  const note = String(payload?.note || "").trim()

  if (!userId) {
    throw createHttpError(401, "Unauthorized.", "UNAUTHORIZED")
  }
  if (!["deposit", "withdraw"].includes(requestType)) {
    throw createHttpError(400, "requestType must be deposit or withdraw.", "VALIDATION_ERROR")
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createHttpError(400, "amount must be a positive number.", "VALIDATION_ERROR")
  }

  const created = await createWalletRequest({
    id: randomUUID(),
    userId,
    requestType,
    amount: Number(amount.toFixed(2)),
    note,
  })
  return sanitizeWalletRequest(created)
}

async function getMyWalletRequests(userId) {
  if (!userId) {
    throw createHttpError(401, "Unauthorized.", "UNAUTHORIZED")
  }
  const rows = await listWalletRequestsByUserId(userId, 300)
  return rows.map(sanitizeWalletRequest)
}

async function getAdminWalletRequests() {
  const rows = await listWalletRequestsForAdmin(500)
  return rows.map(sanitizeWalletRequest)
}

async function setWalletRequestStatus(payload) {
  const requestId = String(payload?.requestId || "").trim()
  const reviewerId = String(payload?.reviewerId || "").trim()
  const status = String(payload?.status || "")
    .trim()
    .toLowerCase()
  const reviewNote = String(payload?.reviewNote || "").trim()

  if (!requestId || !reviewerId) {
    throw createHttpError(401, "Unauthorized.", "UNAUTHORIZED")
  }
  if (!["approved", "rejected"].includes(status)) {
    throw createHttpError(400, "status must be approved or rejected.", "VALIDATION_ERROR")
  }

  const existing = await findWalletRequestById(requestId)
  if (!existing) {
    throw createHttpError(404, "Wallet request not found.", "NOT_FOUND")
  }
  if (existing.status !== "pending") {
    throw createHttpError(400, "Only pending request can be updated.", "INVALID_OPERATION")
  }

  const updated = await updateWalletRequestStatus({
    id: requestId,
    status,
    reviewNote,
    reviewedBy: reviewerId,
  })
  if (!updated) {
    throw createHttpError(404, "Wallet request not found.", "NOT_FOUND")
  }
  const hydrated = await findWalletRequestById(updated.id)
  return sanitizeWalletRequest(hydrated || updated)
}

module.exports = {
  submitWalletRequest,
  getMyWalletRequests,
  getAdminWalletRequests,
  setWalletRequestStatus,
}
