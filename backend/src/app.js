const express = require('express')
const cors = require('cors')
const { env } = require('./config/env')
const apiRoutes = require('./routes/api.routes')
const { errorHandler } = require('./middleware/errorHandler')

function createApp() {
  const app = express()

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === env.WEB_ORIGIN || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
          callback(null, true)
          return
        }
        callback(null, true)
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use((req, res, next) => {
    req.sessionId = req.get('X-Anonymous-Session-Id') || 'anonymous-local-session'
    next()
  })

  app.use('/api', apiRoutes)
  app.use(errorHandler)

  return app
}

module.exports = { createApp }
