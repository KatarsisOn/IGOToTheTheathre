const os = require('os')
const path = require('path')

process.env.JSON_DB_FILE = path.join(
  os.tmpdir(),
  `igotothetheatre-admin-auth-${Date.now()}-${Math.random()}.json`,
)
process.env.DATABASE_MODE = 'json'
process.env.JWT_SECRET = 'admin-auth-test-secret'
process.env.ADMIN_USERNAME = 'admin-test'
process.env.ADMIN_PASSWORD = 'strong-test-password'
process.env.ADMIN_TOKEN_TTL = '1h'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  createAdminToken,
  getAdminPublicInfo,
  verifyAdminCredentials,
} = require('../src/services/adminAuth.service')
const { requireAdminAuth } = require('../src/middleware/adminAuth')
const { JsonStore } = require('../src/db/jsonStore')
const { buildModerationPatch } = require('../src/routes/api.routes')

function createRequest(token = '') {
  return {
    get(name) {
      if (name.toLowerCase() !== 'authorization') return ''
      return token ? `Bearer ${token}` : ''
    },
  }
}

function runMiddleware(req) {
  return new Promise((resolve) => {
    requireAdminAuth(req, {}, (error) => resolve(error || null))
  })
}

async function runProtectedOperation(token, operation) {
  const req = createRequest(token)
  const error = await runMiddleware(req)
  if (error) return { error, data: null }
  return { error: null, data: await operation(req.admin) }
}

test('verifies admin credentials', async () => {
  assert.equal(await verifyAdminCredentials('admin-test', 'strong-test-password'), true)
  assert.equal(await verifyAdminCredentials('admin-test', 'wrong-password'), false)
  assert.equal(await verifyAdminCredentials('other-admin', 'strong-test-password'), false)
})

test('creates public admin info without password data', () => {
  assert.deepEqual(getAdminPublicInfo(), {
    username: 'admin-test',
    role: 'admin',
  })
})

test('rejects missing admin authorization header', async () => {
  const req = createRequest()
  const error = await runMiddleware(req)

  assert.equal(error.status, 401)
  assert.equal(error.code, 'ADMIN_AUTH_REQUIRED')
  assert.equal(req.admin, undefined)
})

test('accepts valid admin token', async () => {
  const req = createRequest(createAdminToken())
  const error = await runMiddleware(req)

  assert.equal(error, null)
  assert.equal(req.admin.username, 'admin-test')
  assert.equal(req.admin.role, 'admin')
})

test('rejects invalid admin token', async () => {
  const req = createRequest('invalid-token')
  const error = await runMiddleware(req)

  assert.equal(error.status, 401)
  assert.equal(error.code, 'ADMIN_AUTH_INVALID')
  assert.equal(req.admin, undefined)
})

test('blocks protected admin edits without token', async () => {
  const store = new JsonStore(process.env.JSON_DB_FILE)
  const eventBefore = store.listEvents()[0]
  const ruleBefore = store.getData().safetyRules[0]
  const sourceBefore = store.getData().dataSources[0]

  const eventResult = await runProtectedOperation('', () =>
    store.updateEvent(eventBefore.id, { title: 'Нельзя изменить без токена' }),
  )
  const ruleResult = await runProtectedOperation('', () =>
    store.upsertSafetyRule({ ...ruleBefore, title: 'Нельзя изменить без токена' }),
  )
  const sourceResult = await runProtectedOperation('', () =>
    store.upsertDataSource({ ...sourceBefore, name: 'Нельзя изменить без токена' }),
  )

  assert.equal(eventResult.error.code, 'ADMIN_AUTH_REQUIRED')
  assert.equal(ruleResult.error.code, 'ADMIN_AUTH_REQUIRED')
  assert.equal(sourceResult.error.code, 'ADMIN_AUTH_REQUIRED')
  assert.equal(store.listEvents().find((event) => event.id === eventBefore.id).title, eventBefore.title)
  assert.equal(store.getData().safetyRules.find((rule) => rule.id === ruleBefore.id).title, ruleBefore.title)
  assert.equal(store.getData().dataSources.find((source) => source.id === sourceBefore.id).name, sourceBefore.name)
})

test('allows protected admin edits with valid token', async () => {
  const token = createAdminToken()
  const store = new JsonStore(process.env.JSON_DB_FILE)
  const eventBefore = store.listEvents()[0]
  const ruleBefore = store.getData().safetyRules[0]
  const sourceBefore = store.getData().dataSources[0]

  const eventResult = await runProtectedOperation(token, () =>
    store.updateEvent(eventBefore.id, { title: 'Обновленное событие' }),
  )
  const ruleResult = await runProtectedOperation(token, () =>
    store.upsertSafetyRule({ ...ruleBefore, title: 'Обновленное правило' }),
  )
  const sourceResult = await runProtectedOperation(token, () =>
    store.upsertDataSource({ ...sourceBefore, name: 'Обновленный источник' }),
  )

  assert.equal(eventResult.error, null)
  assert.equal(ruleResult.error, null)
  assert.equal(sourceResult.error, null)
  assert.equal(eventResult.data.title, 'Обновленное событие')
  assert.equal(ruleResult.data.title, 'Обновленное правило')
  assert.equal(sourceResult.data.name, 'Обновленный источник')
})

test('builds moderation metadata from admin identity', () => {
  const patch = buildModerationPatch(
    { status: 'rejected', reason: 'неподходящий формат' },
    { username: 'admin-test' },
  )

  assert.equal(patch.moderationStatus, 'rejected')
  assert.equal(patch.moderationReason, 'неподходящий формат')
  assert.equal(patch.moderatedBy, 'admin-test')
  assert.match(patch.moderatedAt, /^\d{4}-\d{2}-\d{2}T/)
})
