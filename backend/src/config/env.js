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
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'igotothetheatre',
  JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin'),
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH || '',
  ADMIN_TOKEN_TTL: process.env.ADMIN_TOKEN_TTL || '8h',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  AI_ENABLED: process.env.AI_ENABLED === 'true',
  STORE_FULL_DIALOG_TEXT: process.env.STORE_FULL_DIALOG_TEXT === 'true',
  STATISTICS_ENABLED: process.env.STATISTICS_ENABLED !== 'false',
  REQUEST_BODY_LIMIT: process.env.REQUEST_BODY_LIMIT || '1mb',
  PUBLIC_TEXT_MAX_LENGTH: Number(process.env.PUBLIC_TEXT_MAX_LENGTH || 4000),
  PUBLIC_TEXT_RATE_LIMIT_WINDOW_MS: Number(process.env.PUBLIC_TEXT_RATE_LIMIT_WINDOW_MS || 60_000),
  PUBLIC_TEXT_RATE_LIMIT_MAX: Number(process.env.PUBLIC_TEXT_RATE_LIMIT_MAX || 30),
}

function validateRuntimeConfig(config = env) {
  const errors = []

  if (!['json', 'mongo'].includes(config.DATABASE_MODE)) {
    errors.push('DATABASE_MODE must be either "json" or "mongo".')
  }

  if (config.DATABASE_MODE === 'mongo' && !config.MONGODB_URI) {
    errors.push('MONGODB_URI is required when DATABASE_MODE=mongo.')
  }

  if (config.AI_ENABLED && !config.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required when AI_ENABLED=true.')
  }

  if (config.NODE_ENV === 'production') {
    if (!config.JWT_SECRET || config.JWT_SECRET === 'local-dev-secret' || config.JWT_SECRET.length < 24) {
      errors.push('JWT_SECRET must be a strong private value in production.')
    }

    if (!config.ADMIN_PASSWORD && !config.ADMIN_PASSWORD_HASH) {
      errors.push('ADMIN_PASSWORD or ADMIN_PASSWORD_HASH is required in production.')
    }

    if (config.ADMIN_PASSWORD === 'admin') {
      errors.push('ADMIN_PASSWORD must not use the local default value in production.')
    }
  }

  if (errors.length) {
    const error = new Error(`Invalid runtime configuration:\n- ${errors.join('\n- ')}`)
    error.code = 'INVALID_RUNTIME_CONFIG'
    error.details = errors
    throw error
  }
}

module.exports = { env, rootDir, validateRuntimeConfig }
