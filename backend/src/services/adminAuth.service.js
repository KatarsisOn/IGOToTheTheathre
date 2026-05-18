const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { env } = require('../config/env')

function getAdminPublicInfo() {
  return {
    username: env.ADMIN_USERNAME,
    role: 'admin',
  }
}

async function verifyAdminCredentials(username, password) {
  if (String(username || '').trim() !== env.ADMIN_USERNAME) return false
  if (!password) return false

  if (env.ADMIN_PASSWORD_HASH) {
    return bcrypt.compare(String(password), env.ADMIN_PASSWORD_HASH)
  }

  return Boolean(env.ADMIN_PASSWORD) && String(password) === env.ADMIN_PASSWORD
}

function createAdminToken() {
  return jwt.sign(getAdminPublicInfo(), env.JWT_SECRET, {
    subject: env.ADMIN_USERNAME,
    expiresIn: env.ADMIN_TOKEN_TTL,
  })
}

function verifyAdminToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET)
    if (payload.role !== 'admin' || payload.username !== env.ADMIN_USERNAME) return null
    return getAdminPublicInfo()
  } catch {
    return null
  }
}

module.exports = {
  createAdminToken,
  getAdminPublicInfo,
  verifyAdminCredentials,
  verifyAdminToken,
}
