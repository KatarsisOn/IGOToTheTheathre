const express = require('express')
const cors = require('cors')
const { env } = require('./config/env')
const apiRoutes = require('./routes/api.routes')
const { errorHandler } = require('./middleware/errorHandler')
const { createRequestProtection } = require('./middleware/requestProtection')

function createApp() {
  const app = express()

  app.use(
    cors({
      origin(origin, callback) {
        const isLocalDevOrigin =
          env.NODE_ENV !== 'production' && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin || '')
        if (!origin || origin === env.WEB_ORIGIN || isLocalDevOrigin) {
          callback(null, true)
          return
        }
        callback(null, false)
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }))
  app.use((req, res, next) => {
    req.sessionId = req.get('X-Anonymous-Session-Id') || 'anonymous-local-session'
    next()
  })
  app.use(...createRequestProtection(env))

  app.use('/api', apiRoutes)
  app.use(errorHandler)

  return app
}

module.exports = { createApp }
