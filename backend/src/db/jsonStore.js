const fs = require('fs')
const path = require('path')
const { env } = require('../config/env')
const { createSeedData } = require('../data/seedData')

const REQUIRED_ARRAYS = [
  'cities',
  'stateCategories',
  'strategies',
  'leisureFormats',
  'feedbackReasons',
  'safetyRules',
  'dataSources',
  'events',
  'favorites',
  'recommendations',
  'feedback',
  'history',
  'blacklist',
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

class JsonStore {
  constructor(filePath = env.JSON_DB_FILE) {
    this.filePath = filePath
  }

  ensure() {
    const dir = path.dirname(this.filePath)
    fs.mkdirSync(dir, { recursive: true })

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(createSeedData(), null, 2))
      return
    }

    const data = this.read()
    const seed = createSeedData()
    let changed = false

    for (const key of REQUIRED_ARRAYS) {
      if (!Array.isArray(data[key])) {
        data[key] = clone(seed[key])
        changed = true
      }
    }

    if (!data.profiles || typeof data.profiles !== 'object') {
      data.profiles = {}
      changed = true
    }

    if (!data.meta) {
      data.meta = seed.meta
      changed = true
    }

    if (changed) {
      this.write(data)
    }
  }

  read() {
    const raw = fs.readFileSync(this.filePath, 'utf8')
    return JSON.parse(raw)
  }

  write(data) {
    const tmp = `${this.filePath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
    fs.renameSync(tmp, this.filePath)
  }

  getData() {
    this.ensure()
    return this.read()
  }

  update(mutator) {
    this.ensure()
    const data = this.read()
    const result = mutator(data)
    this.write(data)
    return result
  }

  getCatalog() {
    const data = this.getData()
    return {
      cities: data.cities,
      stateCategories: data.stateCategories,
      strategies: data.strategies,
      leisureFormats: data.leisureFormats,
      feedbackReasons: data.feedbackReasons,
      dataSources: data.dataSources,
    }
  }

  getProfile(sessionId) {
    return this.update((data) => {
      if (!data.profiles[sessionId]) {
        data.profiles[sessionId] = {
          sessionId,
          city: 'Владивосток',
          age: 22,
          interests: ['театр', 'выставки'],
          budget: 1500,
          preferredFormats: ['театр', 'выставки'],
          unwantedFormats: ['поздно ночью', 'алкогольные вечеринки'],
          restrictions: '',
          privacy: {
            statisticsEnabled: env.STATISTICS_ENABLED,
            storeFullDialogText: env.STORE_FULL_DIALOG_TEXT,
            historyEnabled: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }

      return clone(data.profiles[sessionId])
    })
  }

  updateProfile(sessionId, patch) {
    return this.update((data) => {
      const current =
        data.profiles[sessionId] || {
          sessionId,
          city: 'Владивосток',
          age: 22,
          interests: ['театр', 'выставки'],
          budget: 1500,
          preferredFormats: ['театр', 'выставки'],
          unwantedFormats: ['поздно ночью', 'алкогольные вечеринки'],
          restrictions: '',
          privacy: {
            statisticsEnabled: env.STATISTICS_ENABLED,
            storeFullDialogText: env.STORE_FULL_DIALOG_TEXT,
            historyEnabled: true,
          },
          createdAt: new Date().toISOString(),
        }
      data.profiles[sessionId] = {
        ...current,
        ...patch,
        privacy: { ...current.privacy, ...(patch.privacy || {}) },
        updatedAt: new Date().toISOString(),
      }
      return clone(data.profiles[sessionId])
    })
  }

  listRecommendations(sessionId) {
    return this.getData().recommendations.filter((item) => item.sessionId === sessionId)
  }

  getRecommendation(id) {
    return this.getData().recommendations.find((item) => item.id === id) || null
  }

  saveRecommendation(record) {
    return this.update((data) => {
      const recommendation = {
        id: makeId('rec'),
        createdAt: new Date().toISOString(),
        ...record,
      }
      data.recommendations.unshift(recommendation)
      return clone(recommendation)
    })
  }

  saveHistory(record) {
    return this.update((data) => {
      const historyItem = { id: makeId('hist'), createdAt: new Date().toISOString(), ...record }
      data.history.unshift(historyItem)
      return clone(historyItem)
    })
  }

  listHistory(sessionId) {
    return this.getData().history.filter((item) => item.sessionId === sessionId)
  }

  clearHistory(sessionId) {
    return this.update((data) => {
      const before = data.history.length
      data.history = data.history.filter((item) => item.sessionId !== sessionId)
      return { deleted: before - data.history.length }
    })
  }

  saveFeedback(recommendationId, sessionId, feedback) {
    return this.update((data) => {
      const item = {
        id: makeId('feedback'),
        recommendationId,
        sessionId,
        rating: feedback.rating || 'neutral',
        reasons: feedback.reasons || [],
        comment: feedback.comment || '',
        createdAt: new Date().toISOString(),
      }
      data.feedback.unshift(item)
      return clone(item)
    })
  }

  listFavorites(sessionId) {
    const data = this.getData()
    return data.favorites
      .filter((item) => item.sessionId === sessionId)
      .map((favorite) => ({
        ...favorite,
        event: data.events.find((event) => event.id === favorite.eventId) || null,
      }))
  }

  addFavorite(sessionId, eventId) {
    return this.update((data) => {
      const existing = data.favorites.find(
        (item) => item.sessionId === sessionId && item.eventId === eventId,
      )
      if (existing) return clone(existing)

      const item = { id: makeId('fav'), sessionId, eventId, createdAt: new Date().toISOString() }
      data.favorites.unshift(item)
      return clone(item)
    })
  }

  removeFavorite(sessionId, favoriteId) {
    return this.update((data) => {
      const before = data.favorites.length
      data.favorites = data.favorites.filter(
        (item) => item.sessionId !== sessionId || item.id !== favoriteId,
      )
      return { deleted: before - data.favorites.length }
    })
  }

  listEvents(filters = {}) {
    const events = this.getData().events
    return events.filter((event) => {
      if (filters.city && event.city !== filters.city) return false
      if (filters.status && event.moderationStatus !== filters.status) return false
      if (filters.source && event.source !== filters.source) return false
      if (filters.format && event.format !== filters.format) return false
      return true
    })
  }

  createEvent(payload) {
    return this.update((data) => {
      const now = new Date().toISOString()
      const event = {
        id: payload.id || makeId('event'),
        type: payload.type || 'event',
        title: payload.title,
        description: payload.description || '',
        city: payload.city,
        address: payload.address || '',
        dateTime: payload.dateTime || '',
        price: Number(payload.price || 0),
        ageRestriction: payload.ageRestriction || '0+',
        format: payload.format || 'театр',
        strategyId: payload.strategyId || 'recovery',
        tags: payload.tags || [],
        source: payload.source || 'manual',
        sourceUrl: payload.sourceUrl || '#',
        mapUrl: payload.mapUrl || '#',
        rating: Number(payload.rating || 4),
        moderationStatus: payload.moderationStatus || 'pending',
        safetyTags: payload.safetyTags || [],
        createdAt: now,
        updatedAt: now,
      }
      data.events.unshift(event)
      return clone(event)
    })
  }

  updateEvent(id, patch) {
    return this.update((data) => {
      const event = data.events.find((item) => item.id === id)
      if (!event) return null
      Object.assign(event, patch, { updatedAt: new Date().toISOString() })
      return clone(event)
    })
  }

  upsertSafetyRule(rule) {
    return this.update((data) => {
      if (rule.id) {
        const current = data.safetyRules.find((item) => item.id === rule.id)
        if (current) {
          Object.assign(current, rule)
          return clone(current)
        }
      }
      const created = { id: makeId('rule'), enabled: true, severity: 'medium', ...rule }
      data.safetyRules.unshift(created)
      return clone(created)
    })
  }

  upsertDataSource(source) {
    return this.update((data) => {
      if (source.id) {
        const current = data.dataSources.find((item) => item.id === source.id)
        if (current) {
          Object.assign(current, source)
          return clone(current)
        }
      }
      const created = { id: makeId('source'), enabled: false, trustLevel: 'medium', ...source }
      data.dataSources.unshift(created)
      return clone(created)
    })
  }
}

module.exports = { JsonStore, store: new JsonStore(), makeId, clone }
