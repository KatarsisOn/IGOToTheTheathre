const os = require('os')
const path = require('path')

process.env.JSON_DB_FILE = path.join(
  os.tmpdir(),
  `igotothetheatre-test-${Date.now()}-${Math.random()}.json`,
)
process.env.DATABASE_MODE = 'json'

const test = require('node:test')
const assert = require('node:assert/strict')
const { createRecommendation, classifyState } = require('../src/services/recommendation.service')

test('classifies fatigue text', () => {
  assert.equal(classifyState('устала после учебы и нет сил'), 'усталость')
})

test('returns recommendation for safe normal request', async () => {
  const result = await createRecommendation(
    {
      text: 'устала после учебы, хочу спокойно куда-то выбраться',
      city: 'Владивосток',
      budget: 1500,
      interests: ['театр', 'выставки'],
      unwantedFormats: ['фестиваль'],
    },
    'test-session',
  )

  assert.equal(result.status, 'recommendation_shown')
  assert.equal(result.recommendation.city, 'Владивосток')
  assert.ok(result.recommendation.explanation.includes('усталость'))
})

test('returns careful mode instead of event for crisis text', async () => {
  const result = await createRecommendation(
    {
      text: 'есть мысли про самоповреждение',
      city: 'Владивосток',
    },
    'test-session-careful',
  )

  assert.equal(result.status, 'careful_mode')
  assert.equal(result.recommendation, null)
})

test('requires consent for only over-budget safe candidate', async () => {
  const result = await createRecommendation(
    {
      text: 'хочу мастер-класс для уверенности',
      city: 'Владивосток',
      budget: 100,
      interests: ['вокал'],
      unwantedFormats: [],
    },
    'test-session-budget',
  )

  assert.equal(result.status, 'needs_budget_consent')
  assert.ok(result.recommendation.budgetWarning)
})
