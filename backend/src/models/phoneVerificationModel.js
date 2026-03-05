const pool = require("../db/pool")

async function createPhoneVerification(payload) {
  const query = `
    INSERT INTO phone_verifications (id, phone, otp_hash, expires_at)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `
  const values = [payload.id, payload.phone, payload.otpHash, payload.expiresAt]
  const result = await pool.query(query, values)
  return result.rows[0]
}

async function findLatestPhoneVerification(phone) {
  const query = `
    SELECT *
    FROM phone_verifications
    WHERE phone = $1
    ORDER BY created_at DESC
    LIMIT 1;
  `
  const result = await pool.query(query, [phone])
  return result.rows[0] ?? null
}

async function markPhoneVerificationVerified(payload) {
  const query = `
    UPDATE phone_verifications
    SET verification_token = $2, verified_at = $3
    WHERE id = $1
    RETURNING *;
  `
  const values = [payload.id, payload.verificationToken, payload.verifiedAt]
  const result = await pool.query(query, values)
  return result.rows[0] ?? null
}

async function consumeVerificationToken(payload) {
  const query = `
    UPDATE phone_verifications
    SET used_at = NOW()
    WHERE phone = $1
      AND verification_token = $2
      AND verified_at IS NOT NULL
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING *;
  `
  const values = [payload.phone, payload.verificationToken]
  const result = await pool.query(query, values)
  return result.rows[0] ?? null
}

module.exports = {
  createPhoneVerification,
  findLatestPhoneVerification,
  markPhoneVerificationVerified,
  consumeVerificationToken,
}
