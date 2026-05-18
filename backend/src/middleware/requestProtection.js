const { ApiError } = require('./errorHandler')

function isPublicTextEndpoint(req) {
  if (req.method !== 'POST') return false
  if (req.path === '/api/chat/message') return true
  if (req.path === '/api/recommendations') return true
  return /^\/api\/recommendations\/[^/]+\/feedback$/.test(req.path)
}

function publicTextLengthGuard(maxLength) {
  return (req, res, next) => {
    if (!isPublicTextEndpoint(req)) {
      next()
      return
    }

    const body = req.body || {}
    const values = [body.text, body.message, body.comment].filter((value) => value !== undefined)
    const tooLong = values.find((value) => String(value).length > maxLength)

    if (tooLong) {
      next(
        new ApiError(
          413,
          'TEXT_TOO_LONG',
          `Текст запроса слишком длинный. Максимум: ${maxLength} символов.`,
        ),
      )
      return
    }

    next()
  }
}

function createPublicTextRateLimiter({ windowMs, max, now = () => Date.now() }) {
  const buckets = new Map()

  return (req, res, next) => {
    if (!isPublicTextEndpoint(req) || max <= 0) {
      next()
      return
    }

    const timestamp = now()
    const key = req.get('X-Anonymous-Session-Id') || req.ip || 'anonymous'
    const bucket = buckets.get(key)

    if (!bucket || timestamp >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: timestamp + windowMs })
      next()
      return
    }

    bucket.count += 1
    if (bucket.count > max) {
      next(
        new ApiError(
          429,
          'RATE_LIMITED',
          'Слишком много запросов за короткое время. Попробуйте немного позже.',
          { retryAfterMs: Math.max(0, bucket.resetAt - timestamp) },
        ),
      )
      return
    }

    next()
  }
}

function createRequestProtection(config) {
  return [
    publicTextLengthGuard(config.PUBLIC_TEXT_MAX_LENGTH),
    createPublicTextRateLimiter({
      windowMs: config.PUBLIC_TEXT_RATE_LIMIT_WINDOW_MS,
      max: config.PUBLIC_TEXT_RATE_LIMIT_MAX,
    }),
  ]
}

module.exports = {
  createPublicTextRateLimiter,
  createRequestProtection,
  isPublicTextEndpoint,
  publicTextLengthGuard,
}
