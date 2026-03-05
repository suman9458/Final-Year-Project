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
    INSERT INTO users (id, name, email, password_hash, country, proof_of_address, phone, phone_verified_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
  ]
  const result = await pool.query(query, values)
  return result.rows[0]
}

module.exports = {
  findUserByEmail,
  findUserByPhone,
  findUserById,
  createUser,
}
