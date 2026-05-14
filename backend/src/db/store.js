const { env } = require('../config/env')
const { store: jsonStore } = require('./jsonStore')
const { mongoStore } = require('./mongoStore')

module.exports = env.DATABASE_MODE === 'mongo' ? mongoStore : jsonStore
