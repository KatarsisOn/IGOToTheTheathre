const mongoose = require('mongoose')

const options = {
  id: false,
  strict: false,
  versionKey: false,
  timestamps: false,
}

function makeSchema(indexes = []) {
  const schema = new mongoose.Schema({}, options)
  for (const index of indexes) {
    schema.index(index.fields, index.options || {})
  }
  return schema
}

const models = {
  City: mongoose.model('City', makeSchema([{ fields: { id: 1 }, options: { unique: true } }])),
  StateCategory: mongoose.model('StateCategory', makeSchema([{ fields: { value: 1 }, options: { unique: true } }])),
  Strategy: mongoose.model('Strategy', makeSchema([{ fields: { id: 1 }, options: { unique: true } }])),
  LeisureFormat: mongoose.model('LeisureFormat', makeSchema([{ fields: { value: 1 }, options: { unique: true } }])),
  FeedbackReason: mongoose.model('FeedbackReason', makeSchema([{ fields: { value: 1 }, options: { unique: true } }])),
  SafetyRule: mongoose.model('SafetyRule', makeSchema([{ fields: { id: 1 }, options: { unique: true } }])),
  DataSource: mongoose.model('DataSource', makeSchema([{ fields: { id: 1 }, options: { unique: true } }])),
  Event: mongoose.model('Event', makeSchema([{ fields: { id: 1 }, options: { unique: true } }])),
  Profile: mongoose.model('Profile', makeSchema([{ fields: { sessionId: 1 }, options: { unique: true } }])),
  Favorite: mongoose.model(
    'Favorite',
    makeSchema([
      { fields: { id: 1 }, options: { unique: true } },
      { fields: { sessionId: 1, eventId: 1 }, options: { unique: true } },
    ]),
  ),
  Recommendation: mongoose.model('Recommendation', makeSchema([{ fields: { id: 1 }, options: { unique: true } }])),
  Feedback: mongoose.model('Feedback', makeSchema([{ fields: { id: 1 }, options: { unique: true } }])),
  History: mongoose.model('History', makeSchema([{ fields: { id: 1 }, options: { unique: true } }])),
  BlacklistItem: mongoose.model('BlacklistItem', makeSchema([{ fields: { id: 1 }, options: { unique: true } }])),
}

module.exports = { models }
