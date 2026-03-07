const pool = require("../db/pool")

async function createUserSession(payload) {
  const query = `
    INSERT INTO user_sessions (id, user_id, session_token_id, user_agent, ip_address)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `
  const values = [payload.id, payload.userId, payload.sessionTokenId, payload.userAgent, payload.ipAddress]
  const result = await pool.query(query, values)
  return result.rows[0] ?? null
}

async function findActiveSessionByTokenId(sessionTokenId) {
  const query = `
    SELECT *
    FROM user_sessions
    WHERE session_token_id = $1
      AND revoked_at IS NULL
    LIMIT 1;
  `
  const result = await pool.query(query, [sessionTokenId])
  return result.rows[0] ?? null
}

async function touchSessionByTokenId(sessionTokenId) {
  const query = `
    UPDATE user_sessions
    SET last_seen_at = NOW()
    WHERE session_token_id = $1
      AND revoked_at IS NULL
    RETURNING *;
  `
  const result = await pool.query(query, [sessionTokenId])
  return result.rows[0] ?? null
}

async function listUserSessionsByUserId(userId) {
  const query = `
    SELECT id, user_id, session_token_id, user_agent, ip_address, created_at, last_seen_at, revoked_at
    FROM user_sessions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 20;
  `
  const result = await pool.query(query, [userId])
  return result.rows
}

async function revokeUserSessionById(payload) {
  const query = `
    UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE id = $1
      AND user_id = $2
      AND revoked_at IS NULL
    RETURNING *;
  `
  const values = [payload.sessionId, payload.userId]
  const result = await pool.query(query, values)
  return result.rows[0] ?? null
}

module.exports = {
  createUserSession,
  findActiveSessionByTokenId,
  touchSessionByTokenId,
  listUserSessionsByUserId,
  revokeUserSessionById,
}

