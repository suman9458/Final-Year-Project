const pool = require("../db/pool")

async function getTradingStateByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT user_id, state, updated_at
     FROM trading_states
     WHERE user_id = $1`,
    [userId]
  )
  return rows[0] || null
}

async function upsertTradingState({ userId, state }) {
  const { rows } = await pool.query(
    `INSERT INTO trading_states (user_id, state, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       state = EXCLUDED.state,
       updated_at = NOW()
     RETURNING user_id, state, updated_at`,
    [userId, JSON.stringify(state)]
  )
  return rows[0]
}

module.exports = {
  getTradingStateByUserId,
  upsertTradingState,
}
