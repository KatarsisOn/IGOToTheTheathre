const CRISIS_PATTERNS = [
  /самоповреж/i,
  /суицид/i,
  /покончить/i,
  /не хочу жить/i,
  /убить себя/i,
  /насили/i,
  /угрож/i,
  /опасност/i,
  /зависимост/i,
  /передоз/i,
  /сильн(ая|ый|ое)? паник/i,
]

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

function analyzeTextSafety(text, rules = []) {
  const normalized = normalizeText(text)
  const deterministicMatches = CRISIS_PATTERNS.filter((pattern) => pattern.test(normalized)).map(
    (pattern) => pattern.source,
  )
  const ruleMatches = rules
    .filter((rule) => rule.enabled && rule.type === 'text')
    .filter((rule) => new RegExp(rule.pattern, 'i').test(normalized))
    .map((rule) => rule.title)

  const matches = [...deterministicMatches, ...ruleMatches]

  return {
    carefulMode: matches.length > 0,
    matches,
    message:
      'Похоже, сейчас лучше не подбирать мероприятие. Я не являюсь специалистом или экстренной службой. Если есть риск для вас или другого человека, пожалуйста, обратитесь к человеку рядом, которому доверяете, квалифицированному специалисту или в местные экстренные службы.',
  }
}

function parseAgeRestriction(ageRestriction) {
  const match = String(ageRestriction || '').match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function isAgeAllowed(userAge, ageRestriction) {
  if (!userAge) return true
  return Number(userAge) >= parseAgeRestriction(ageRestriction)
}

function eventSafetyRisks(event, userRestrictions = '', rules = []) {
  const searchable = normalizeText(
    [
      event.title,
      event.description,
      event.dateTime,
      event.format,
      ...(event.tags || []),
      ...(event.safetyTags || []),
    ].join(' '),
  )
  const restrictions = normalizeText(userRestrictions)

  const ruleRisks = rules
    .filter((rule) => rule.enabled && rule.type === 'event')
    .filter((rule) => new RegExp(rule.pattern, 'i').test(searchable))
    .map((rule) => rule.title)

  const userRestrictionRisks = restrictions
    ? restrictions
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => searchable.includes(item))
        .map((item) => `пользовательское ограничение: ${item}`)
    : []

  const statusRisks =
    event.moderationStatus !== 'approved' ? [`статус модерации: ${event.moderationStatus}`] : []

  return [...statusRisks, ...ruleRisks, ...userRestrictionRisks]
}

function isEventSafe(event, userRestrictions, rules) {
  return eventSafetyRisks(event, userRestrictions, rules).length === 0
}

module.exports = {
  analyzeTextSafety,
  eventSafetyRisks,
  isAgeAllowed,
  isEventSafe,
  parseAgeRestriction,
}
