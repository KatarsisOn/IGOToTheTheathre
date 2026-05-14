const store = require('../db/store')
const { analyzeTextSafety, eventSafetyRisks, isAgeAllowed } = require('./safety.service')

const DEFAULT_PARAMS = {
  city: 'Владивосток',
  age: 22,
  budget: 1500,
  time: 'Сегодня вечером',
  interests: ['театр', 'выставки'],
  company: 'одна/один',
  unwantedFormats: [],
  restrictions: '',
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeParams(input = {}, profile = {}) {
  return {
    ...DEFAULT_PARAMS,
    ...profile,
    ...input,
    budget: Number(input.budget ?? profile.budget ?? DEFAULT_PARAMS.budget),
    age: Number(input.age ?? profile.age ?? DEFAULT_PARAMS.age),
    interests: asArray(input.interests ?? profile.interests ?? DEFAULT_PARAMS.interests),
    unwantedFormats: asArray(input.unwantedFormats ?? profile.unwantedFormats),
    restrictions: input.restrictions ?? profile.restrictions ?? '',
    text: input.text || input.message || '',
  }
}

function classifyState(text) {
  const normalized = String(text || '').toLowerCase()
  if (/устал|выгор|нет сил|перегруз|после учеб|после работ/.test(normalized)) return 'усталость'
  if (/тревог|паник|страш|нерв/.test(normalized)) return 'тревога'
  if (/одинок|никого|не с кем|хочу людей/.test(normalized)) return 'одиночество'
  if (/работ|карьер|собесед|резюм|професс/.test(normalized)) return 'карьерная неопределенность'
  if (/денег|дорого|эконом|финанс/.test(normalized)) return 'финансовое напряжение'
  if (/родител|поколен|семь/.test(normalized)) return 'поколенческий конфликт'
  if (/конфликт|несправедлив|напряж/.test(normalized)) return 'социальное напряжение'
  return 'желание сменить обстановку'
}

function selectStrategy(category, strategies) {
  return (
    strategies.find((strategy) => strategy.categories.includes(category)) ||
    strategies.find((strategy) => strategy.id === 'recovery') ||
    strategies[0]
  )
}

function scoreEvent(event, params, strategy, feedback = []) {
  let score = Math.round((event.rating || 4) * 10)
  if (event.city === params.city) score += 30
  if (event.strategyId === strategy.id) score += 24
  if (params.interests.includes(event.format)) score += 18
  if (event.price <= params.budget) score += 12
  if (/сегодня/i.test(params.time) && /сегодня|ежедневно/i.test(event.dateTime)) score += 8
  if (/завтра/i.test(params.time) && /завтра/i.test(event.dateTime)) score += 8
  if (/компан/i.test(params.company) && /группа|фестиваль|дискус/i.test(event.tags.join(' '))) score += 5

  const rejected = feedback.some(
    (item) =>
      item.eventId === event.id ||
      (item.rating === 'bad' && item.recommendationSnapshot?.eventId === event.id),
  )
  if (rejected) score -= 20
  return Math.max(0, Math.min(100, score))
}

function buildExplanation(event, params, category, strategy) {
  const budgetLine =
    event.price <= params.budget
      ? `укладывается в бюджет до ${params.budget} ₽`
      : `выше бюджета ${params.budget} ₽, поэтому требует отдельного согласия`

  return `Я выбрал этот вариант, потому что он относится к категории «${category}», поддерживает стратегию «${strategy.title}», подходит по формату «${event.format}», проходит в городе ${event.city} и ${budgetLine}.`
}

function toRecommendationPayload(record) {
  return {
    status: record.status,
    recommendationId: record.id,
    message: record.message,
    stateCategory: record.stateCategory,
    strategy: record.strategy,
    params: record.params,
    recommendation: record.recommendationSnapshot,
    alternatives: record.alternatives || [],
    safety: record.safety || null,
  }
}

async function createRecommendation(input, sessionId = 'anonymous') {
  const data = await store.getData()
  const profile = await store.getProfile(sessionId)
  const params = normalizeParams(input, profile)
  const textSafety = analyzeTextSafety(params.text, data.safetyRules)

  if (textSafety.carefulMode) {
    const record = await store.saveRecommendation({
      sessionId,
      status: 'careful_mode',
      message: textSafety.message,
      params: { ...params, text: profile.privacy.storeFullDialogText ? params.text : undefined },
      stateCategory: 'режим бережной поддержки',
      strategy: { id: 'careful', title: 'Сначала безопасность и поддержка' },
      recommendationSnapshot: null,
      alternatives: [],
      safety: textSafety,
    })
    if (profile.privacy.historyEnabled) {
      await store.saveHistory({
        sessionId,
        status: 'careful_mode',
        stateCategory: 'режим бережной поддержки',
        recommendationId: record.id,
        text: profile.privacy.storeFullDialogText ? params.text : undefined,
      })
    }
    return toRecommendationPayload(record)
  }

  const stateCategory = input.stateCategory || classifyState(params.text)
  const strategy = selectStrategy(stateCategory, data.strategies)
  const allowedFormats = new Set([...strategy.formats, ...params.interests])
  const activeFeedback = data.feedback.filter((item) => item.sessionId === sessionId)

  const byCity = data.events.filter((event) => event.city === params.city)
  const fallbackCity = byCity.length > 0 ? byCity : data.events
  const candidates = fallbackCity
    .filter((event) => allowedFormats.has(event.format))
    .filter((event) => !params.unwantedFormats.includes(event.format))
    .filter((event) => isAgeAllowed(params.age, event.ageRestriction))
    .map((event) => ({
      event,
      risks: eventSafetyRisks(event, params.restrictions, data.safetyRules),
    }))

  const safeCandidates = candidates.filter((candidate) => candidate.risks.length === 0)
  const safeWithinBudget = safeCandidates.filter((candidate) => candidate.event.price <= params.budget)
  const pool = safeWithinBudget.length ? safeWithinBudget : safeCandidates

  if (!safeCandidates.length) {
    const record = await store.saveRecommendation({
      sessionId,
      status: 'no_safe_match',
      message:
        'По этим параметрам я не нашёл безопасного подходящего события. Можно расширить бюджет, изменить время или выбрать похожий спокойный формат.',
      params: { ...params, text: profile.privacy.storeFullDialogText ? params.text : undefined },
      stateCategory,
      strategy,
      recommendationSnapshot: null,
      alternatives: [],
      safety: { filteredOut: candidates.map((candidate) => ({ id: candidate.event.id, risks: candidate.risks })) },
    })
    if (profile.privacy.historyEnabled) {
      await store.saveHistory({ sessionId, status: 'no_safe_match', stateCategory, recommendationId: record.id })
    }
    return toRecommendationPayload(record)
  }

  const ranked = pool
    .map((candidate) => ({
      ...candidate,
      score: scoreEvent(candidate.event, params, strategy, activeFeedback),
    }))
    .sort((a, b) => b.score - a.score)

  const best = ranked[0]
  const status = best.event.price > params.budget ? 'needs_budget_consent' : 'recommendation_shown'
  const alternatives = ranked.slice(1, 4).map(({ event, score }) => ({
    ...event,
    score,
    explanation: buildExplanation(event, params, stateCategory, strategy),
  }))
  const recommendationSnapshot = {
    ...best.event,
    score: best.score,
    explanation: buildExplanation(best.event, params, stateCategory, strategy),
    budgetWarning:
      best.event.price > params.budget
        ? `Этот вариант стоит ${best.event.price} ₽ и выше бюджета ${params.budget} ₽.`
        : '',
  }

  const message =
    status === 'needs_budget_consent'
      ? 'Я нашёл безопасный вариант, но он выше указанного бюджета. Показать его всё равно?'
      : 'Нашёл один самый подходящий безопасный вариант. Его можно сохранить, оценить или заменить альтернативой.'

  const record = await store.saveRecommendation({
    sessionId,
    status,
    message,
    params: { ...params, text: profile.privacy.storeFullDialogText ? params.text : undefined },
    stateCategory,
    strategy,
    recommendationSnapshot,
    alternatives,
    safety: {
      filteredOut: candidates
        .filter((candidate) => candidate.risks.length > 0)
        .map((candidate) => ({ id: candidate.event.id, risks: candidate.risks })),
    },
  })

  if (profile.privacy.historyEnabled) {
    await store.saveHistory({
      sessionId,
      status,
      stateCategory,
      strategyId: strategy.id,
      recommendationId: record.id,
      eventId: best.event.id,
      text: profile.privacy.storeFullDialogText ? params.text : undefined,
    })
  }

  return toRecommendationPayload(record)
}

module.exports = {
  buildExplanation,
  classifyState,
  createRecommendation,
  normalizeParams,
  selectStrategy,
  scoreEvent,
}
