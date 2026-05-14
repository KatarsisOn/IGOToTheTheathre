class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function sendOk(res, data, status = 200) {
  res.status(status).json({ ok: true, data })
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err)
    return
  }

  const status = err.status || 500
  const code = err.code || 'INTERNAL_ERROR'
  const message =
    status >= 500
      ? 'Не удалось выполнить запрос. Попробуйте ещё раз.'
      : err.message || 'Проверьте данные и повторите запрос.'

  res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      details: err.details,
    },
  })
}

module.exports = { ApiError, asyncHandler, errorHandler, sendOk }
