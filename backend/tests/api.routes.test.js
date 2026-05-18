const os = require('os')
const path = require('path')

process.env.JSON_DB_FILE = path.join(
  os.tmpdir(),
  `igotothetheatre-api-${Date.now()}-${Math.random()}.json`,
)
process.env.DATABASE_MODE = 'json'
process.env.JWT_SECRET = 'api-test-secret-that-is-long-enough'
process.env.ADMIN_USERNAME = 'api-admin'
process.env.ADMIN_PASSWORD = 'api-admin-password'
process.env.PUBLIC_TEXT_MAX_LENGTH = '120'
process.env.PUBLIC_TEXT_RATE_LIMIT_MAX = '100'

const test = require('node:test')
const assert = require('node:assert/strict')
const store = require('../src/db/store')
const { validateRuntimeConfig } = require('../src/config/env')
const { buildModerationPatch } = require('../src/routes/api.routes')
const { publicTextLengthGuard, createPublicTextRateLimiter } = require('../src/middleware/requestProtection')
const { createRecommendation } = require('../src/services/recommendation.service')
const { importManualEvents } = require('../src/services/dataLoader.service')

function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (error) => resolve(error || null))
  })
}

function createTextRequest({ path: pathname = '/api/recommendations', body = {}, sessionId = 'api-test' } = {}) {
  return {
    method: 'POST',
    path: pathname,
    body,
    ip: '127.0.0.1',
    get(name) {
      if (name.toLowerCase() === 'x-anonymous-session-id') return sessionId
      return ''
    },
  }
}

test('profile, recommendation history, favorites, and feedback work through API services', async () => {
  const sessionId = 'api-user-flow'
  const profile = await store.updateProfile(sessionId, {
    city: 'Москва',
    budget: 1700,
    privacy: { historyEnabled: true, storeFullDialogText: false },
  })
  assert.equal(profile.city, 'Москва')
  assert.equal(profile.privacy.storeFullDialogText, false)

  const recommendation = await createRecommendation(
    {
      text: 'устала после учебы, хочу спокойный театр',
      city: 'Москва',
      budget: 1700,
      interests: ['документальный театр'],
    },
    sessionId,
  )
  assert.equal(recommendation.status, 'recommendation_shown')

  const history = await store.listHistory(sessionId)
  assert.equal(history.length, 1)
  assert.equal(history[0].text, undefined)

  const favorite = await store.addFavorite(sessionId, recommendation.recommendation.id)
  assert.equal(favorite.eventId, recommendation.recommendation.id)

  const favorites = await store.listFavorites(sessionId)
  assert.equal(favorites.length, 1)
  assert.equal(favorites[0].event.id, recommendation.recommendation.id)

  const feedback = await store.saveFeedback(recommendation.recommendationId, sessionId, {
    rating: 'good',
    reasons: ['интересно'],
    comment: 'подходит',
  })
  assert.equal(feedback.rating, 'good')

  const clearResult = await store.clearHistory(sessionId)
  assert.equal(clearResult.deleted, 1)
})

test('privacy consent allows storing full user text', async () => {
  const sessionId = 'api-privacy-consent'
  const text = 'устала после учебы, хочу спокойно куда-то выбраться'

  await store.updateProfile(sessionId, {
    privacy: { historyEnabled: true, storeFullDialogText: true },
  })

  await createRecommendation(
    {
      text,
      city: 'Владивосток',
      interests: ['театр'],
    },
    sessionId,
  )

  const history = await store.listHistory(sessionId)
  assert.equal(history[0].text, text)
})

test('admin moderation and data import update moderation metadata', async () => {
  const importResult = await importManualEvents([
    {
      title: 'Тестовая читка новой пьесы',
      city: 'Владивосток',
      address: 'ул. Театральная, 1',
      dateTime: 'Четверг, 19:00',
      price: 700,
      format: 'театр',
      sourceUrl: 'https://example.com/test-reading',
    },
  ])

  assert.equal(importResult.imported.length, 1)
  const eventId = importResult.imported[0].id
  const moderated = await store.updateEvent(
    eventId,
    buildModerationPatch({ status: 'approved', reason: 'проверено' }, { username: 'api-admin' }),
  )

  assert.equal(moderated.moderationStatus, 'approved')
  assert.equal(moderated.moderationReason, 'проверено')
  assert.equal(moderated.moderatedBy, 'api-admin')
  assert.match(moderated.moderatedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('public text endpoints reject overlong text', async () => {
  const error = await runMiddleware(
    publicTextLengthGuard(120),
    createTextRequest({ body: { text: 'очень длинный текст '.repeat(20) } }),
  )

  assert.equal(error.status, 413)
  assert.equal(error.code, 'TEXT_TOO_LONG')
})

test('public text endpoints are rate limited by session', async () => {
  let currentTime = 1_000
  const limiter = createPublicTextRateLimiter({
    windowMs: 60_000,
    max: 2,
    now: () => currentTime,
  })
  const req = createTextRequest({ body: { text: 'хочу выбрать событие' }, sessionId: 'limited-user' })

  assert.equal(await runMiddleware(limiter, req), null)
  assert.equal(await runMiddleware(limiter, req), null)

  const error = await runMiddleware(limiter, req)
  assert.equal(error.status, 429)
  assert.equal(error.code, 'RATE_LIMITED')

  currentTime += 60_001
  assert.equal(await runMiddleware(limiter, req), null)
})

test('runtime validation blocks unsafe production defaults', () => {
  assert.throws(
    () =>
      validateRuntimeConfig({
        NODE_ENV: 'production',
        DATABASE_MODE: 'json',
        JWT_SECRET: 'local-dev-secret',
        ADMIN_PASSWORD: 'admin',
        ADMIN_PASSWORD_HASH: '',
        AI_ENABLED: false,
        OPENAI_API_KEY: '',
      }),
    /JWT_SECRET/,
  )
})
