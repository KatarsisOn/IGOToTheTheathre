const path = require('path')
const dotenv = require('dotenv')

dotenv.config()

const rootDir = path.resolve(__dirname, '..', '..')

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  WEB_ORIGIN: process.env.WEB_ORIGIN || 'http://127.0.0.1:5173',
  DATABASE_MODE: process.env.DATABASE_MODE || 'json',
  JSON_DB_FILE:
    process.env.JSON_DB_FILE || path.join(rootDir, 'data', 'app-store.json'),
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  AI_ENABLED: process.env.AI_ENABLED === 'true',
  STORE_FULL_DIALOG_TEXT: process.env.STORE_FULL_DIALOG_TEXT === 'true',
  STATISTICS_ENABLED: process.env.STATISTICS_ENABLED !== 'false',
}

module.exports = { env, rootDir }
