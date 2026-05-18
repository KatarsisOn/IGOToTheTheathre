const { ApiError } = require('./errorHandler')
const { verifyAdminToken } = require('../services/adminAuth.service')

function requireAdminAuth(req, res, next) {
  const header = req.get('Authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    next(new ApiError(401, 'ADMIN_AUTH_REQUIRED', 'Войдите как администратор.'))
    return
  }

  const admin = verifyAdminToken(match[1])
  if (!admin) {
    next(new ApiError(401, 'ADMIN_AUTH_INVALID', 'Админ-сессия недействительна или истекла.'))
    return
  }

  req.admin = admin
  next()
}

module.exports = { requireAdminAuth }
