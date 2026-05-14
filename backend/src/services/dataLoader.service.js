const store = require('../db/store')

function normalizeManualEvent(input) {
  return {
    type: input.type || 'event',
    title: input.title,
    description: input.description || '',
    city: input.city || 'Владивосток',
    address: input.address || '',
    dateTime: input.dateTime || 'Дата уточняется',
    price: Number(input.price || 0),
    ageRestriction: input.ageRestriction || '0+',
    format: input.format || 'театр',
    strategyId: input.strategyId || 'recovery',
    tags: Array.isArray(input.tags) ? input.tags : [],
    source: input.source || 'manual',
    sourceUrl: input.sourceUrl || '#',
    mapUrl: input.mapUrl || '#',
    rating: Number(input.rating || 4),
    moderationStatus: 'pending',
    safetyTags: Array.isArray(input.safetyTags) ? input.safetyTags : [],
  }
}

function duplicateKey(event) {
  return [event.title, event.city, event.address, event.dateTime, event.sourceUrl]
    .map((part) => String(part || '').trim().toLowerCase())
    .join('|')
}

async function importManualEvents(events = []) {
  const existingKeys = new Set((await store.getData()).events.map(duplicateKey))
  const imported = []
  const duplicates = []

  for (const rawEvent of events) {
    const event = normalizeManualEvent(rawEvent)
    const key = duplicateKey(event)
    if (existingKeys.has(key)) {
      duplicates.push(event.title)
      continue
    }
    imported.push(await store.createEvent(event))
    existingKeys.add(key)
  }

  return { imported, duplicates }
}

async function loadDemoExternalBatch() {
  return importManualEvents([
    {
      title: 'Открытая лекция «Как смотреть современный театр»',
      description: 'Вводная лекция без подготовки, подходит для первого знакомства с театром.',
      city: 'Владивосток',
      address: 'ул. Алеутская, 35',
      dateTime: 'Среда, 18:30',
      price: 300,
      ageRestriction: '16+',
      format: 'лекция',
      strategyId: 'recovery',
      tags: ['недорого', 'спокойно'],
      source: 'manual',
      sourceUrl: 'https://example.com/lecture/theatre-intro',
      mapUrl: 'https://maps.example.com/?q=Алеутская+35+Владивосток',
      rating: 4.2,
    },
  ])
}

module.exports = { importManualEvents, loadDemoExternalBatch, normalizeManualEvent }
