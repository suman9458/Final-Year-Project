function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err.status) ? err.status : 500
  const message = err.message || "Internal server error"
  const code = typeof err.code === "string" ? err.code : status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"
  const requestId = req.requestId || null

  res.status(status).json({
    error: {
      message,
      code,
      status,
      requestId,
      ...(err.details ? { details: err.details } : {}),
    },
  })
}

module.exports = {
  errorHandler,
}
