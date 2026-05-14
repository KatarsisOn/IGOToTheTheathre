const test = require('node:test')
const assert = require('node:assert/strict')
const {
  analyzeTextSafety,
  eventSafetyRisks,
  isAgeAllowed,
} = require('../src/services/safety.service')
const { safetyRules } = require('../src/data/seedData')

test('detects careful mode for crisis text', () => {
  const result = analyzeTextSafety('мне опасно и есть мысли про суицид', safetyRules)
  assert.equal(result.carefulMode, true)
  assert.ok(result.message.includes('не подбирать мероприятие'))
})

test('allows normal leisure text', () => {
  const result = analyzeTextSafety('устала после учебы, хочу спокойно выйти в театр', safetyRules)
  assert.equal(result.carefulMode, false)
})

test('filters unsafe event by moderation, alcohol and late time', () => {
  const risks = eventSafetyRisks(
    {
      title: 'Ночная вечеринка с коктейльной программой',
      description: 'алкогольная программа',
      dateTime: '23:30',
      format: 'фестиваль',
      tags: ['ночь'],
      safetyTags: [],
      moderationStatus: 'pending',
    },
    '',
    safetyRules,
  )
  assert.ok(risks.length >= 3)
})

test('checks age restrictions', () => {
  assert.equal(isAgeAllowed(17, '18+'), false)
  assert.equal(isAgeAllowed(18, '18+'), true)
})
