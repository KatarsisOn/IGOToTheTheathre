const express = require('express')
const store = require('../db/store')
const { requireAdminAuth } = require('../middleware/adminAuth')
const { createRecommendation } = require('../services/recommendation.service')
const {
  createAdminToken,
  getAdminPublicInfo,
  verifyAdminCredentials,
} = require('../services/adminAuth.service')
const { importManualEvents, loadDemoExternalBatch } = require('../services/dataLoader.service')
const { ApiError, asyncHandler, sendOk } = require('../middleware/errorHandler')

const router = express.Router()

function requireEventPayload(body) {
  if (!body.title || !body.city) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Укажите название и город события.')
  }
}

function buildModerationPatch(body, admin) {
  return {
    moderationStatus: body.status || 'approved',
    moderationReason: body.reason || '',
    moderatedAt: new Date().toISOString(),
    moderatedBy: admin.username,
  }
}

function buildAdminEventPatch(body, admin) {
  const patch = { ...body }
  if (patch.moderationStatus) {
    patch.moderatedAt = new Date().toISOString()
    patch.moderatedBy = admin.username
  }
  return patch
}

router.get('/health', (req, res) => {
  sendOk(res, {
    service: 'IGoToTheTheatre API',
    status: 'ok',
    storage: store.storage || 'json',
    uptime: process.uptime(),
  })
})

router.post('/auth/admin/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {}
  const isValid = await verifyAdminCredentials(username, password)

  if (!isValid) {
    throw new ApiError(401, 'ADMIN_AUTH_FAILED', 'Неверный логин или пароль администратора.')
  }

  sendOk(res, {
    token: createAdminToken(),
    admin: getAdminPublicInfo(),
  })
}))

router.get('/auth/admin/me', requireAdminAuth, (req, res) => {
  sendOk(res, { admin: req.admin })
})

router.get(
  '/catalog',
  asyncHandler(async (req, res) => {
    sendOk(res, await store.getCatalog())
  }),
)

router.post(
  '/chat/message',
  asyncHandler(async (req, res) => {
    const result = await createRecommendation(req.body || {}, req.sessionId)
    sendOk(res, result, 201)
  }),
)

router.post(
  '/recommendations',
  asyncHandler(async (req, res) => {
    const result = await createRecommendation(req.body || {}, req.sessionId)
    sendOk(res, result, 201)
  }),
)

router.get('/recommendations/:id', asyncHandler(async (req, res) => {
  const recommendation = await store.getRecommendation(req.params.id)
  if (!recommendation) throw new ApiError(404, 'NOT_FOUND', 'Рекомендация не найдена.')
  sendOk(res, recommendation)
}))

router.post('/recommendations/:id/feedback', asyncHandler(async (req, res) => {
  const recommendation = await store.getRecommendation(req.params.id)
  if (!recommendation) throw new ApiError(404, 'NOT_FOUND', 'Рекомендация не найдена.')
  const feedback = await store.saveFeedback(req.params.id, req.sessionId, {
    ...req.body,
    recommendationSnapshot: recommendation.recommendationSnapshot,
  })
  sendOk(res, feedback, 201)
}))

router.get('/profile/me', asyncHandler(async (req, res) => {
  sendOk(res, await store.getProfile(req.sessionId))
}))

router.put('/profile/me', asyncHandler(async (req, res) => {
  sendOk(res, await store.updateProfile(req.sessionId, req.body || {}))
}))

router.get('/favorites', asyncHandler(async (req, res) => {
  sendOk(res, await store.listFavorites(req.sessionId))
}))

router.post('/favorites', asyncHandler(async (req, res) => {
  if (!req.body.eventId) throw new ApiError(400, 'VALIDATION_ERROR', 'Укажите eventId.')
  sendOk(res, await store.addFavorite(req.sessionId, req.body.eventId), 201)
}))

router.delete('/favorites/:id', asyncHandler(async (req, res) => {
  sendOk(res, await store.removeFavorite(req.sessionId, req.params.id))
}))

router.get('/history', asyncHandler(async (req, res) => {
  sendOk(res, await store.listHistory(req.sessionId))
}))

router.delete('/history', asyncHandler(async (req, res) => {
  sendOk(res, await store.clearHistory(req.sessionId))
}))

router.use('/admin', requireAdminAuth)

router.get('/admin/events', asyncHandler(async (req, res) => {
  sendOk(res, await store.listEvents(req.query))
}))

router.post('/admin/events', asyncHandler(async (req, res) => {
  requireEventPayload(req.body || {})
  sendOk(res, await store.createEvent(req.body), 201)
}))

router.put('/admin/events/:id', asyncHandler(async (req, res) => {
  const event = await store.updateEvent(req.params.id, buildAdminEventPatch(req.body || {}, req.admin))
  if (!event) throw new ApiError(404, 'NOT_FOUND', 'Событие не найдено.')
  sendOk(res, event)
}))

router.post('/admin/events/:id/moderate', asyncHandler(async (req, res) => {
  const event = await store.updateEvent(req.params.id, buildModerationPatch(req.body || {}, req.admin))
  if (!event) throw new ApiError(404, 'NOT_FOUND', 'Событие не найдено.')
  sendOk(res, event)
}))

router.get('/admin/safety-rules', asyncHandler(async (req, res) => {
  sendOk(res, (await store.getData()).safetyRules)
}))

router.post('/admin/safety-rules', asyncHandler(async (req, res) => {
  if (!req.body.title || !req.body.pattern) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Укажите название и шаблон правила.')
  }
  sendOk(res, await store.upsertSafetyRule(req.body), 201)
}))

router.put('/admin/safety-rules/:id', asyncHandler(async (req, res) => {
  sendOk(res, await store.upsertSafetyRule({ ...req.body, id: req.params.id }))
}))

router.get('/admin/data-sources', asyncHandler(async (req, res) => {
  sendOk(res, (await store.getData()).dataSources)
}))

router.post('/admin/data-sources', asyncHandler(async (req, res) => {
  if (!req.body.name) throw new ApiError(400, 'VALIDATION_ERROR', 'Укажите название источника.')
  sendOk(res, await store.upsertDataSource(req.body), 201)
}))

router.put('/admin/data-sources/:id', asyncHandler(async (req, res) => {
  if (req.body.name === '') throw new ApiError(400, 'VALIDATION_ERROR', 'Укажите название источника.')
  sendOk(res, await store.upsertDataSource({ ...req.body, id: req.params.id }))
}))

router.post('/admin/data-sources/import', asyncHandler(async (req, res) => {
  const result = Array.isArray(req.body.events)
    ? await importManualEvents(req.body.events)
    : await loadDemoExternalBatch()
  sendOk(res, result, 201)
}))

module.exports = router
module.exports.buildAdminEventPatch = buildAdminEventPatch
module.exports.buildModerationPatch = buildModerationPatch
