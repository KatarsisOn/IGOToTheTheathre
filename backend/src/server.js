const { createApp } = require('./app')
const { env, validateRuntimeConfig } = require('./config/env')
const store = require('./db/store')

async function start() {
  validateRuntimeConfig()
  await store.ensure()

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
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})
