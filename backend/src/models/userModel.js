const pool = require("../db/pool")

async function findUserByEmail(email) {
  const result = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email])
  return result.rows[0] ?? null
}

async function findUserByPhone(phone) {
  const result = await pool.query("SELECT * FROM users WHERE phone = $1 LIMIT 1", [phone])
  return result.rows[0] ?? null
}

async function findUserById(id) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id])
  return result.rows[0] ?? null
}

async function createUser(payload) {
  const query = `
    INSERT INTO users (id, name, email, password_hash, country, proof_of_address, phone, phone_verified_at, role)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `
  const values = [
    payload.id,
    payload.name,
    payload.email,
    payload.passwordHash,
    payload.country,
    payload.proofOfAddress,
    payload.phone,
    payload.phoneVerifiedAt,
    payload.role || "user",
  ]
  const result = await pool.query(query, values)
  return result.rows[0]
}

async function updateUserProfileById(payload) {
  const query = `
    UPDATE users
    SET
      name = $2,
      country = $3,
      proof_of_address = $4,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `
  const values = [payload.id, payload.name, payload.country, payload.proofOfAddress]
  const result = await pool.query(query, values)
  return result.rows[0] ?? null
}

async function updateUserPasswordById(payload) {
  const query = `
    UPDATE users
    SET
      password_hash = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `
  const values = [payload.id, payload.passwordHash]
  const result = await pool.query(query, values)
  return result.rows[0] ?? null
}

async function incrementUserTokenVersionById(id) {
  const query = `
    UPDATE users
    SET
      token_version = COALESCE(token_version, 0) + 1,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `
  const result = await pool.query(query, [id])
  return result.rows[0] ?? null
}

async function updateUserRoleById(payload) {
  const query = `
    UPDATE users
    SET role = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `
  const values = [payload.id, payload.role]
  const result = await pool.query(query, values)
  return result.rows[0] ?? null
}

module.exports = {
  findUserByEmail,
  findUserByPhone,
  findUserById,
  createUser,
  updateUserProfileById,
  updateUserPasswordById,
  incrementUserTokenVersionById,
  updateUserRoleById,
}
