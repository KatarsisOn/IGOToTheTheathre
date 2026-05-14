const { createApp } = require('./app')
const { env } = require('./config/env')
const store = require('./db/store')

store.ensure()

const app = createApp()

const server = app.listen(env.PORT, '127.0.0.1', () => {
  console.log(`IGoToTheTheatre API listening on http://127.0.0.1:${env.PORT}`)
})

function shutdown(signal) {
  console.log(`Received ${signal}, closing API server`)
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
