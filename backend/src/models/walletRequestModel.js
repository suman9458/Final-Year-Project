const pool = require("../db/pool")

async function createWalletRequest(payload) {
  const query = `
    INSERT INTO wallet_requests (id, user_id, request_type, amount, status, note)
    VALUES ($1, $2, $3, $4, 'pending', $5)
    RETURNING *;
  `
  const values = [payload.id, payload.userId, payload.requestType, payload.amount, payload.note || null]
  const result = await pool.query(query, values)
  return result.rows[0] ?? null
}

async function listWalletRequestsByUserId(userId, limit = 200) {
  const query = `
    SELECT wr.*, reviewer.email AS reviewer_email
    FROM wallet_requests wr
    LEFT JOIN users reviewer ON reviewer.id = wr.reviewed_by
    WHERE wr.user_id = $1
    ORDER BY wr.created_at DESC
    LIMIT $2;
  `
  const result = await pool.query(query, [userId, limit])
  return result.rows
}

async function listWalletRequestsForAdmin(limit = 400) {
  const query = `
    SELECT
      wr.*,
      requester.name AS requester_name,
      requester.email AS requester_email,
      reviewer.email AS reviewer_email
    FROM wallet_requests wr
    JOIN users requester ON requester.id = wr.user_id
    LEFT JOIN users reviewer ON reviewer.id = wr.reviewed_by
    ORDER BY wr.created_at DESC
    LIMIT $1;
  `
  const result = await pool.query(query, [limit])
  return result.rows
}

async function updateWalletRequestStatus(payload) {
  const query = `
    UPDATE wallet_requests
    SET
      status = $2,
      review_note = $3,
      reviewed_by = $4,
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `
  const values = [payload.id, payload.status, payload.reviewNote || null, payload.reviewedBy]
  const result = await pool.query(query, values)
  return result.rows[0] ?? null
}

async function findWalletRequestById(id) {
  const query = `
    SELECT wr.*, requester.name AS requester_name, requester.email AS requester_email, reviewer.email AS reviewer_email
    FROM wallet_requests wr
    JOIN users requester ON requester.id = wr.user_id
    LEFT JOIN users reviewer ON reviewer.id = wr.reviewed_by
    WHERE wr.id = $1
    LIMIT 1;
  `
  const result = await pool.query(query, [id])
  return result.rows[0] ?? null
}

module.exports = {
  createWalletRequest,
  listWalletRequestsByUserId,
  listWalletRequestsForAdmin,
  updateWalletRequestStatus,
  findWalletRequestById,
}
