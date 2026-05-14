const mongoose = require('mongoose')
const { env } = require('../config/env')
const { createSeedData } = require('../data/seedData')
const { makeId, clone } = require('./jsonStore')
const { models } = require('./mongoModels')

function plain(doc) {
  if (!doc) return null
  const value = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, __v, ...rest } = value
  return clone(rest)
}

function defaultProfile(sessionId) {
  return {
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

class MongoStore {
  constructor() {
    this.connectionPromise = null
    this.ensurePromise = null
    this.isEnsured = false
    this.storage = 'mongo'
  }

  async connect() {
    if (mongoose.connection.readyState === 1) return
    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required when DATABASE_MODE=mongo')
    }
    if (!this.connectionPromise) {
      this.connectionPromise = mongoose.connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 10000,
      })
    }
    await this.connectionPromise
  }

  async ensure() {
    await this.connect()
    if (this.isEnsured) return
    if (this.ensurePromise) {
      await this.ensurePromise
      return
    }

    this.ensurePromise = this.seed()
    await this.ensurePromise
    this.isEnsured = true
  }

  async seed() {
    const seed = createSeedData()

    await Promise.all([
      this.seedCollection(models.City, seed.cities, (item) => ({ id: item.id })),
      this.seedScalarCollection(models.StateCategory, seed.stateCategories),
      this.seedCollection(models.Strategy, seed.strategies, (item) => ({ id: item.id })),
      this.seedScalarCollection(models.LeisureFormat, seed.leisureFormats),
      this.seedScalarCollection(models.FeedbackReason, seed.feedbackReasons),
      this.seedCollection(models.SafetyRule, seed.safetyRules, (item) => ({ id: item.id })),
      this.seedCollection(models.DataSource, seed.dataSources, (item) => ({ id: item.id })),
      this.seedCollection(models.Event, seed.events, (item) => ({ id: item.id })),
    ])
  }

  async seedCollection(Model, items, filterFor) {
    for (const item of items) {
      await Model.updateOne(filterFor(item), { $setOnInsert: item }, { upsert: true })
    }
  }

  async seedScalarCollection(Model, items) {
    for (const value of items) {
      await Model.updateOne({ value }, { $setOnInsert: { value } }, { upsert: true })
    }
  }

  async getData() {
    await this.ensure()
    const [
      cities,
      stateCategories,
      strategies,
      leisureFormats,
      feedbackReasons,
      safetyRules,
      dataSources,
      events,
      favorites,
      recommendations,
      feedback,
      history,
      blacklist,
      profiles,
    ] = await Promise.all([
      models.City.find().lean(),
      models.StateCategory.find().lean(),
      models.Strategy.find().lean(),
      models.LeisureFormat.find().lean(),
      models.FeedbackReason.find().lean(),
      models.SafetyRule.find().lean(),
      models.DataSource.find().lean(),
      models.Event.find().lean(),
      models.Favorite.find().lean(),
      models.Recommendation.find().lean(),
      models.Feedback.find().lean(),
      models.History.find().lean(),
      models.BlacklistItem.find().lean(),
      models.Profile.find().lean(),
    ])

    return {
      cities: cities.map(plain),
      stateCategories: stateCategories.map((item) => item.value),
      strategies: strategies.map(plain),
      leisureFormats: leisureFormats.map((item) => item.value),
      feedbackReasons: feedbackReasons.map((item) => item.value),
      safetyRules: safetyRules.map(plain),
      dataSources: dataSources.map(plain),
      events: events.map(plain),
      favorites: favorites.map(plain),
      recommendations: recommendations.map(plain),
      feedback: feedback.map(plain),
      history: history.map(plain),
      blacklist: blacklist.map(plain),
      profiles: Object.fromEntries(profiles.map((profile) => [profile.sessionId, plain(profile)])),
    }
  }

  async getCatalog() {
    const data = await this.getData()
    return {
      cities: data.cities,
      stateCategories: data.stateCategories,
      strategies: data.strategies,
      leisureFormats: data.leisureFormats,
      feedbackReasons: data.feedbackReasons,
      dataSources: data.dataSources,
    }
  }

  async getProfile(sessionId) {
    await this.ensure()
    const profile = await models.Profile.findOneAndUpdate(
      { sessionId },
      { $setOnInsert: defaultProfile(sessionId) },
      { upsert: true, returnDocument: 'after' },
    )
    return plain(profile)
  }

  async updateProfile(sessionId, patch) {
    const current = await this.getProfile(sessionId)
    const next = {
      ...current,
      ...patch,
      privacy: { ...current.privacy, ...(patch.privacy || {}) },
      updatedAt: new Date().toISOString(),
    }
    const profile = await models.Profile.findOneAndUpdate(
      { sessionId },
      { $set: next },
      { returnDocument: 'after' },
    )
    return plain(profile)
  }

  async listRecommendations(sessionId) {
    return (await models.Recommendation.find({ sessionId }).sort({ createdAt: -1 }).lean()).map(plain)
  }

  async getRecommendation(id) {
    return plain(await models.Recommendation.findOne({ id }).lean())
  }

  async saveRecommendation(record) {
    const recommendation = {
      id: makeId('rec'),
      createdAt: new Date().toISOString(),
      ...record,
    }
    await models.Recommendation.create(recommendation)
    return clone(recommendation)
  }

  async saveHistory(record) {
    const historyItem = { id: makeId('hist'), createdAt: new Date().toISOString(), ...record }
    await models.History.create(historyItem)
    return clone(historyItem)
  }

  async listHistory(sessionId) {
    return (await models.History.find({ sessionId }).sort({ createdAt: -1 }).lean()).map(plain)
  }

  async clearHistory(sessionId) {
    const result = await models.History.deleteMany({ sessionId })
    return { deleted: result.deletedCount }
  }

  async saveFeedback(recommendationId, sessionId, feedback) {
    const item = {
      id: makeId('feedback'),
      recommendationId,
      sessionId,
      rating: feedback.rating || 'neutral',
      reasons: feedback.reasons || [],
      comment: feedback.comment || '',
      createdAt: new Date().toISOString(),
    }
    await models.Feedback.create(item)
    return clone(item)
  }

  async listFavorites(sessionId) {
    const favorites = (await models.Favorite.find({ sessionId }).sort({ createdAt: -1 }).lean()).map(plain)
    const events = await models.Event.find({
      id: { $in: favorites.map((favorite) => favorite.eventId) },
    }).lean()
    const eventsById = new Map(events.map((event) => [event.id, plain(event)]))
    return favorites.map((favorite) => ({ ...favorite, event: eventsById.get(favorite.eventId) || null }))
  }

  async addFavorite(sessionId, eventId) {
    const existing = await models.Favorite.findOne({ sessionId, eventId }).lean()
    if (existing) return plain(existing)

    const item = { id: makeId('fav'), sessionId, eventId, createdAt: new Date().toISOString() }
    await models.Favorite.create(item)
    return clone(item)
  }

  async removeFavorite(sessionId, favoriteId) {
    const result = await models.Favorite.deleteMany({ sessionId, id: favoriteId })
    return { deleted: result.deletedCount }
  }

  async listEvents(filters = {}) {
    const query = {}
    if (filters.city) query.city = filters.city
    if (filters.status) query.moderationStatus = filters.status
    if (filters.source) query.source = filters.source
    if (filters.format) query.format = filters.format
    return (await models.Event.find(query).sort({ createdAt: -1 }).lean()).map(plain)
  }

  async createEvent(payload) {
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
    await models.Event.create(event)
    return clone(event)
  }

  async updateEvent(id, patch) {
    return plain(
      await models.Event.findOneAndUpdate(
        { id },
        { $set: { ...patch, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' },
      ).lean(),
    )
  }

  async upsertSafetyRule(rule) {
    const id = rule.id || makeId('rule')
    return plain(
      await models.SafetyRule.findOneAndUpdate(
        { id },
        { $set: { enabled: true, severity: 'medium', ...rule, id } },
        { upsert: true, returnDocument: 'after' },
      ).lean(),
    )
  }

  async upsertDataSource(source) {
    const id = source.id || makeId('source')
    return plain(
      await models.DataSource.findOneAndUpdate(
        { id },
        { $set: { enabled: false, trustLevel: 'medium', ...source, id } },
        { upsert: true, returnDocument: 'after' },
      ).lean(),
    )
  }
}

module.exports = { MongoStore, mongoStore: new MongoStore() }
