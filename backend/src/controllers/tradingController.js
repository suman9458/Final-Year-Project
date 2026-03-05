const { getTradingStateByUserId, upsertTradingState } = require("../models/tradingStateModel")

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

async function getState(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      throw createHttpError(401, "Unauthorized.")
    }

    const savedState = await getTradingStateByUserId(userId)
    res.status(200).json({
      state: savedState?.state || null,
      updatedAt: savedState?.updated_at || null,
    })
  } catch (error) {
    next(error)
  }
}

async function saveState(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      throw createHttpError(401, "Unauthorized.")
    }

    const state = req.body?.state
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      throw createHttpError(400, "state must be a valid object.")
    }

    const savedState = await upsertTradingState({ userId, state })
    res.status(200).json({
      state: savedState.state,
      updatedAt: savedState.updated_at,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getState,
  saveState,
}
