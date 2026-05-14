const express = require('express')
const store = require('../db/store')
const { createRecommendation } = require('../services/recommendation.service')
const { importManualEvents, loadDemoExternalBatch } = require('../services/dataLoader.service')
const { ApiError, asyncHandler, sendOk } = require('../middleware/errorHandler')

const router = express.Router()

function requireEventPayload(body) {
  if (!body.title || !body.city) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Укажите название и город события.')
  }
}

router.get('/health', (req, res) => {
  sendOk(res, {
    service: 'IGoToTheTheatre API',
    status: 'ok',
    storage: 'json',
    uptime: process.uptime(),
  })
})

router.get('/catalog', (req, res) => {
  sendOk(res, store.getCatalog())
})

router.post(
  '/chat/message',
  asyncHandler(async (req, res) => {
    const result = createRecommendation(req.body || {}, req.sessionId)
    sendOk(res, result, 201)
  }),
)

router.post(
  '/recommendations',
  asyncHandler(async (req, res) => {
    const result = createRecommendation(req.body || {}, req.sessionId)
    sendOk(res, result, 201)
  }),
)

router.get('/recommendations/:id', (req, res) => {
  const recommendation = store.getRecommendation(req.params.id)
  if (!recommendation) throw new ApiError(404, 'NOT_FOUND', 'Рекомендация не найдена.')
  sendOk(res, recommendation)
})

router.post('/recommendations/:id/feedback', (req, res) => {
  const recommendation = store.getRecommendation(req.params.id)
  if (!recommendation) throw new ApiError(404, 'NOT_FOUND', 'Рекомендация не найдена.')
  const feedback = store.saveFeedback(req.params.id, req.sessionId, {
    ...req.body,
    recommendationSnapshot: recommendation.recommendationSnapshot,
  })
  sendOk(res, feedback, 201)
})

router.get('/profile/me', (req, res) => {
  sendOk(res, store.getProfile(req.sessionId))
})

router.put('/profile/me', (req, res) => {
  sendOk(res, store.updateProfile(req.sessionId, req.body || {}))
})

router.get('/favorites', (req, res) => {
  sendOk(res, store.listFavorites(req.sessionId))
})

router.post('/favorites', (req, res) => {
  if (!req.body.eventId) throw new ApiError(400, 'VALIDATION_ERROR', 'Укажите eventId.')
  sendOk(res, store.addFavorite(req.sessionId, req.body.eventId), 201)
})

router.delete('/favorites/:id', (req, res) => {
  sendOk(res, store.removeFavorite(req.sessionId, req.params.id))
})

router.get('/history', (req, res) => {
  sendOk(res, store.listHistory(req.sessionId))
})

router.delete('/history', (req, res) => {
  sendOk(res, store.clearHistory(req.sessionId))
})

router.get('/admin/events', (req, res) => {
  sendOk(res, store.listEvents(req.query))
})

router.post('/admin/events', (req, res) => {
  requireEventPayload(req.body || {})
  sendOk(res, store.createEvent(req.body), 201)
})

router.put('/admin/events/:id', (req, res) => {
  const event = store.updateEvent(req.params.id, req.body || {})
  if (!event) throw new ApiError(404, 'NOT_FOUND', 'Событие не найдено.')
  sendOk(res, event)
})

router.post('/admin/events/:id/moderate', (req, res) => {
  const event = store.updateEvent(req.params.id, {
    moderationStatus: req.body.status || 'approved',
    moderationReason: req.body.reason || '',
  })
  if (!event) throw new ApiError(404, 'NOT_FOUND', 'Событие не найдено.')
  sendOk(res, event)
})

router.get('/admin/safety-rules', (req, res) => {
  sendOk(res, store.getData().safetyRules)
})

router.post('/admin/safety-rules', (req, res) => {
  if (!req.body.title || !req.body.pattern) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Укажите название и шаблон правила.')
  }
  sendOk(res, store.upsertSafetyRule(req.body), 201)
})

router.put('/admin/safety-rules/:id', (req, res) => {
  sendOk(res, store.upsertSafetyRule({ ...req.body, id: req.params.id }))
})

router.get('/admin/data-sources', (req, res) => {
  sendOk(res, store.getData().dataSources)
})

router.post('/admin/data-sources', (req, res) => {
  if (!req.body.name) throw new ApiError(400, 'VALIDATION_ERROR', 'Укажите название источника.')
  sendOk(res, store.upsertDataSource(req.body), 201)
})

router.post('/admin/data-sources/import', (req, res) => {
  const result = Array.isArray(req.body.events)
    ? importManualEvents(req.body.events)
    : loadDemoExternalBatch()
  sendOk(res, result, 201)
})

module.exports = router
