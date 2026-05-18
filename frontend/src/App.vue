<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  api,
  clearAdminToken,
  getAdminToken,
  getSessionId,
  resetSessionId,
  setAdminToken,
} from './services/api'

const userTabs = ['Чат', 'Профиль', 'Избранное', 'История', 'Приватность']
const activeTab = ref('Чат')
const catalog = ref({
  cities: [],
  leisureFormats: [],
  feedbackReasons: [],
  strategies: [],
  dataSources: [],
})
const apiStatus = ref('проверяется')
const errorMessage = ref('')
const loading = ref(false)
const actionMessage = ref('')
const sessionId = ref(getSessionId())
const adminToken = ref(getAdminToken())
const adminInfo = ref(null)
const showAdminLogin = ref(false)
const adminLogin = ref({
  username: 'admin',
  password: '',
})

const profile = ref(null)
const favorites = ref([])
const history = ref([])
const adminEvents = ref([])
const safetyRules = ref([])
const dataSources = ref([])
const result = ref(null)
const feedbackChoice = ref('')
const rejectionReason = ref('')

const form = ref({
  text: 'устала после учебы, хочу спокойно куда-то выбраться',
  city: 'Владивосток',
  age: 22,
  budget: 1500,
  time: 'Сегодня вечером',
  company: 'одна/один',
  interests: ['театр', 'выставки'],
  unwantedFormats: ['поздно ночью', 'алкогольные вечеринки'],
  restrictions: '',
})

const adminDraft = ref({
  title: 'Творческий вечер без открытой сцены',
  city: 'Владивосток',
  address: 'ул. Адмирала Фокина, 10',
  dateTime: 'Четверг, 18:30',
  price: 700,
  ageRestriction: '16+',
  format: 'дискуссии',
  strategyId: 'social',
  description: 'Модерируемая встреча в малой группе, подходит для мягкого социального контакта.',
  source: 'manual',
  sourceUrl: '#',
  mapUrl: '#',
  moderationStatus: 'pending',
  tagsText: '',
  safetyTagsText: '',
})

const ruleDraft = ref({
  title: 'Громкий ночной формат',
  type: 'event',
  pattern: 'громк|рейв|ночн',
  severity: 'medium',
  enabled: true,
})

const sourceDraft = ref({
  name: 'Новый источник',
  type: 'external',
  trustLevel: 'medium',
  enabled: false,
})

const adminView = ref('events')
const editingEventId = ref('')
const editingRuleId = ref('')
const editingSourceId = ref('')
const adminFilters = ref({
  city: '',
  status: '',
  source: '',
  format: '',
})
const moderationReason = ref('')

const chatMessages = ref([
  {
    author: 'bot',
    text: 'Расскажи, где ты сейчас и какого отдыха хочется. Я подберу один безопасный культурный вариант без диагнозов и давления.',
  },
])

const cities = computed(() => catalog.value.cities.map((city) => city.name))
const tabs = computed(() => (adminToken.value ? [...userTabs, 'Админ'] : userTabs))
const interests = computed(() => catalog.value.leisureFormats)
const strategies = computed(() => catalog.value.strategies)
const sourceOptions = computed(() => dataSources.value.length ? dataSources.value : catalog.value.dataSources)
const recommendation = computed(() => result.value?.recommendation || null)
const alternatives = computed(() => result.value?.alternatives || [])
const isCarefulMode = computed(() => result.value?.status === 'careful_mode')
const isNoMatch = computed(() => result.value?.status === 'no_safe_match')
const needsBudgetConsent = computed(() => result.value?.status === 'needs_budget_consent')
const statusLabel = computed(() => {
  if (!result.value) return 'ожидает запроса'
  if (isCarefulMode.value) return 'бережная поддержка'
  if (isNoMatch.value) return 'нет безопасного совпадения'
  if (needsBudgetConsent.value) return 'нужно согласие по бюджету'
  return 'рекомендация готова'
})

const adminStatusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'pending', label: 'на модерации' },
  { value: 'approved', label: 'одобрено' },
  { value: 'rejected', label: 'отклонено' },
  { value: 'draft', label: 'черновик' },
  { value: 'archived', label: 'архив' },
]

const moderationStatusOptions = adminStatusOptions.filter((item) => item.value)
const ruleTypeOptions = [
  { value: 'text', label: 'текст пользователя' },
  { value: 'event', label: 'описание события' },
]
const severityOptions = [
  { value: 'low', label: 'низкая' },
  { value: 'medium', label: 'средняя' },
  { value: 'high', label: 'высокая' },
  { value: 'critical', label: 'критическая' },
]
const trustLevelOptions = [
  { value: 'low', label: 'низкий' },
  { value: 'medium', label: 'средний' },
  { value: 'high', label: 'высокий' },
]

function setFormFromProfile(nextProfile) {
  form.value = {
    ...form.value,
    city: nextProfile.city || form.value.city,
    age: nextProfile.age || form.value.age,
    budget: nextProfile.budget || form.value.budget,
    interests: nextProfile.interests?.length ? nextProfile.interests : form.value.interests,
    unwantedFormats: nextProfile.unwantedFormats || form.value.unwantedFormats,
    restrictions: nextProfile.restrictions || '',
  }
}

function parseCsv(value) {
  if (Array.isArray(value)) return value
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function csvText(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '')
}

function statusText(status) {
  const labels = {
    approved: 'одобрено',
    pending: 'на модерации',
    rejected: 'отклонено',
    draft: 'черновик',
    archived: 'архив',
  }
  return labels[status] || status || 'не указан'
}

function boolText(value) {
  return value ? 'включено' : 'выключено'
}

function sourceName(sourceId) {
  return sourceOptions.value.find((source) => source.id === sourceId)?.name || sourceId || 'не указан'
}

function buildAdminEventsQuery() {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(adminFilters.value)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

function resetEventDraft() {
  editingEventId.value = ''
  adminDraft.value = {
    title: 'Творческий вечер без открытой сцены',
    city: form.value.city || 'Владивосток',
    address: 'ул. Адмирала Фокина, 10',
    dateTime: 'Четверг, 18:30',
    price: 700,
    ageRestriction: '16+',
    format: interests.value[0] || 'театр',
    strategyId: strategies.value[0]?.id || 'recovery',
    description: 'Модерируемая встреча в малой группе, подходит для мягкого социального контакта.',
    source: sourceOptions.value[0]?.id || 'manual',
    sourceUrl: '#',
    mapUrl: '#',
    moderationStatus: 'pending',
    tagsText: '',
    safetyTagsText: '',
  }
}

function editEvent(event) {
  editingEventId.value = event.id
  adminView.value = 'events'
  adminDraft.value = {
    title: event.title || '',
    city: event.city || form.value.city || 'Владивосток',
    address: event.address || '',
    dateTime: event.dateTime || '',
    price: Number(event.price || 0),
    ageRestriction: event.ageRestriction || '0+',
    format: event.format || interests.value[0] || 'театр',
    strategyId: event.strategyId || strategies.value[0]?.id || 'recovery',
    description: event.description || '',
    source: event.source || sourceOptions.value[0]?.id || 'manual',
    sourceUrl: event.sourceUrl || '#',
    mapUrl: event.mapUrl || '#',
    moderationStatus: event.moderationStatus || 'pending',
    tagsText: csvText(event.tags),
    safetyTagsText: csvText(event.safetyTags),
  }
}

function eventPayloadFromDraft() {
  return {
    title: adminDraft.value.title,
    city: adminDraft.value.city,
    address: adminDraft.value.address,
    dateTime: adminDraft.value.dateTime,
    price: Number(adminDraft.value.price || 0),
    ageRestriction: adminDraft.value.ageRestriction,
    format: adminDraft.value.format,
    strategyId: adminDraft.value.strategyId,
    description: adminDraft.value.description,
    source: adminDraft.value.source,
    sourceUrl: adminDraft.value.sourceUrl,
    mapUrl: adminDraft.value.mapUrl,
    moderationStatus: adminDraft.value.moderationStatus,
    tags: parseCsv(adminDraft.value.tagsText),
    safetyTags: parseCsv(adminDraft.value.safetyTagsText),
  }
}

function resetRuleDraft() {
  editingRuleId.value = ''
  ruleDraft.value = {
    title: 'Громкий ночной формат',
    type: 'event',
    pattern: 'громк|рейв|ночн',
    severity: 'medium',
    enabled: true,
  }
}

function editSafetyRule(rule) {
  editingRuleId.value = rule.id
  adminView.value = 'rules'
  ruleDraft.value = {
    title: rule.title || '',
    type: rule.type || 'event',
    pattern: rule.pattern || '',
    severity: rule.severity || 'medium',
    enabled: rule.enabled !== false,
  }
}

function resetSourceDraft() {
  editingSourceId.value = ''
  sourceDraft.value = {
    name: 'Новый источник',
    type: 'external',
    trustLevel: 'medium',
    enabled: false,
  }
}

function editDataSource(source) {
  editingSourceId.value = source.id
  adminView.value = 'sources'
  sourceDraft.value = {
    name: source.name || '',
    type: source.type || 'external',
    trustLevel: source.trustLevel || 'medium',
    enabled: source.enabled === true,
  }
}

function toggleInterest(interest) {
  if (form.value.interests.includes(interest)) {
    form.value.interests = form.value.interests.filter((item) => item !== interest)
    return
  }
  form.value.interests = [...form.value.interests, interest]
}

function pushBot(text) {
  chatMessages.value = [...chatMessages.value, { author: 'bot', text }]
}

async function refreshUserData() {
  const [nextFavorites, nextHistory] = await Promise.all([api.getFavorites(), api.getHistory()])
  favorites.value = nextFavorites
  history.value = nextHistory
}

async function refreshAdminData() {
  if (!adminToken.value) return

  const [events, rules, sources] = await Promise.all([
    api.getAdminEvents(buildAdminEventsQuery()),
    api.getSafetyRules(),
    api.getDataSources(),
  ])
  adminEvents.value = events
  safetyRules.value = rules
  dataSources.value = sources
}

function clearAdminSession(message = '') {
  clearAdminToken()
  adminToken.value = ''
  adminInfo.value = null
  adminEvents.value = []
  safetyRules.value = []
  dataSources.value = []
  adminLogin.value.password = ''
  if (activeTab.value === 'Админ') activeTab.value = 'Чат'
  if (message) actionMessage.value = message
}

async function restoreAdminSession() {
  if (!adminToken.value) return

  try {
    const session = await api.getAdminSession()
    adminInfo.value = session.admin
    await refreshAdminData()
  } catch {
    clearAdminSession()
  }
}

async function loadInitialData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [health, nextCatalog, nextProfile] = await Promise.all([
      api.health(),
      api.catalog(),
      api.getProfile(),
    ])
    apiStatus.value = health.status
    catalog.value = nextCatalog
    profile.value = nextProfile
    setFormFromProfile(nextProfile)
    await refreshUserData()
    await restoreAdminSession()
  } catch (error) {
    apiStatus.value = 'недоступен'
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

async function loginAdmin() {
  loading.value = true
  errorMessage.value = ''
  actionMessage.value = ''

  try {
    const session = await api.loginAdmin(adminLogin.value)
    setAdminToken(session.token)
    adminToken.value = session.token
    adminInfo.value = session.admin
    adminLogin.value.password = ''
    await refreshAdminData()
    activeTab.value = 'Админ'
    showAdminLogin.value = false
    actionMessage.value = 'Вход администратора выполнен.'
  } catch (error) {
    clearAdminSession()
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

function logoutAdmin() {
  clearAdminSession('Вы вышли из режима администратора.')
}

function handleAdminError(error) {
  if (error.status === 401) {
    clearAdminSession()
    errorMessage.value = 'Админ-сессия истекла. Войдите снова.'
    return
  }

  errorMessage.value = error.message
}

async function sendMessage() {
  const text = form.value.text.trim()
  if (!text) return

  loading.value = true
  errorMessage.value = ''
  actionMessage.value = ''
  chatMessages.value = [...chatMessages.value, { author: 'user', text }]

  try {
    const response = await api.sendMessage({
      ...form.value,
      text,
      unwantedFormats: parseCsv(form.value.unwantedFormats),
      restrictions: form.value.restrictions,
    })
    result.value = response
    feedbackChoice.value = ''
    rejectionReason.value = ''
    pushBot(response.message)
    await refreshUserData()
  } catch (error) {
    errorMessage.value = error.message
    pushBot('Не удалось получить ответ от сервера. Проверьте, запущен ли backend.')
  } finally {
    loading.value = false
  }
}

async function saveCurrentRecommendation() {
  if (!recommendation.value) return
  try {
    await api.addFavorite(recommendation.value.id)
    actionMessage.value = 'Сохранено в избранное.'
    await refreshUserData()
  } catch (error) {
    errorMessage.value = error.message
  }
}

async function submitFeedback(rating) {
  if (!result.value?.recommendationId) return
  feedbackChoice.value = rating
  try {
    await api.sendFeedback(result.value.recommendationId, {
      rating,
      reasons: rejectionReason.value ? [rejectionReason.value] : [],
    })
    actionMessage.value = rating === 'good' ? 'Спасибо, отметила как подходящее.' : 'Принято, подберём иначе.'
    await refreshUserData()
  } catch (error) {
    errorMessage.value = error.message
  }
}

async function requestAlternatives() {
  form.value.interests = alternatives.value[0]?.format ? [alternatives.value[0].format] : form.value.interests
  await sendMessage()
}

async function updateProfile() {
  try {
    profile.value = await api.updateProfile({
      city: form.value.city,
      age: form.value.age,
      budget: form.value.budget,
      interests: form.value.interests,
      unwantedFormats: parseCsv(form.value.unwantedFormats),
      restrictions: form.value.restrictions,
      privacy: profile.value?.privacy,
    })
    actionMessage.value = 'Профиль обновлён.'
  } catch (error) {
    errorMessage.value = error.message
  }
}

async function updatePrivacy(patch) {
  try {
    profile.value = await api.updateProfile({
      privacy: { ...profile.value.privacy, ...patch },
    })
    actionMessage.value = 'Настройки приватности сохранены.'
  } catch (error) {
    errorMessage.value = error.message
  }
}

async function clearHistory() {
  await api.clearHistory()
  await refreshUserData()
  actionMessage.value = 'История удалена.'
}

async function removeFavorite(favoriteId) {
  await api.removeFavorite(favoriteId)
  await refreshUserData()
}

async function resetAnonymousSession() {
  sessionId.value = resetSessionId()
  result.value = null
  chatMessages.value = [chatMessages.value[0]]
  await loadInitialData()
  actionMessage.value = 'Анонимная сессия обновлена.'
}

async function saveAdminEvent() {
  try {
    const payload = eventPayloadFromDraft()
    if (editingEventId.value) {
      await api.updateAdminEvent(editingEventId.value, payload)
      actionMessage.value = 'Событие обновлено.'
    } else {
      await api.createAdminEvent(payload)
      actionMessage.value = 'Событие добавлено в очередь модерации.'
    }
    resetEventDraft()
    await refreshAdminData()
  } catch (error) {
    handleAdminError(error)
  }
}

async function moderateEvent(event, status) {
  try {
    await api.moderateEvent(event.id, { status, reason: moderationReason.value })
    actionMessage.value = status === 'approved' ? 'Событие одобрено.' : 'Событие отклонено.'
    moderationReason.value = ''
    await refreshAdminData()
  } catch (error) {
    handleAdminError(error)
  }
}

async function saveSafetyRule() {
  try {
    if (editingRuleId.value) {
      await api.updateSafetyRule(editingRuleId.value, ruleDraft.value)
      actionMessage.value = 'Правило безопасности обновлено.'
    } else {
      await api.createSafetyRule(ruleDraft.value)
      actionMessage.value = 'Правило безопасности добавлено.'
    }
    resetRuleDraft()
    await refreshAdminData()
  } catch (error) {
    handleAdminError(error)
  }
}

async function saveDataSource() {
  if (!editingSourceId.value) return
  try {
    await api.updateDataSource(editingSourceId.value, sourceDraft.value)
    actionMessage.value = 'Источник данных обновлён.'
    resetSourceDraft()
    await refreshAdminData()
  } catch (error) {
    handleAdminError(error)
  }
}

async function applyAdminFilters() {
  try {
    await refreshAdminData()
  } catch (error) {
    handleAdminError(error)
  }
}

async function importDemoEvents() {
  try {
    const response = await api.importDemoEvents()
    actionMessage.value = `Импортировано: ${response.imported.length}, дубликатов: ${response.duplicates.length}.`
    await refreshAdminData()
  } catch (error) {
    handleAdminError(error)
  }
}

onMounted(loadInitialData)
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar" aria-label="Навигация">
      <a class="brand" href="#" aria-label="Я иду в театр">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <path d="M8 7h16v18H8z" />
            <path d="M12 11h8M12 16h8M12 21h5" />
          </svg>
        </span>
        <span>
          <strong>Я иду в театр!</strong>
          <small>IGoToTheTheatre</small>
        </span>
      </a>

      <nav class="main-nav" aria-label="Разделы">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </nav>

      <section class="sidebar-block">
        <h2>Контекст</h2>
        <label>
          Город
          <select v-model="form.city">
            <option v-for="city in cities" :key="city">{{ city }}</option>
          </select>
        </label>
        <label>
          Возраст
          <input v-model.number="form.age" type="number" min="12" max="99" />
        </label>
      </section>

      <section class="safety-note">
        <strong>API: {{ apiStatus }}</strong>
        <p>Сессия: {{ sessionId.slice(0, 8) }}. При потенциально опасных сигналах рекомендации блокируются.</p>
      </section>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <h1>Подбор безопасного культурного выхода</h1>
          <p>Чат, рекомендации, история, избранное, приватность и модерация работают через серверный API.</p>
        </div>
        <div class="topbar-actions">
          <button
            v-if="!adminToken"
            type="button"
            class="ghost-button"
            data-testid="admin-login-toggle"
            @click="showAdminLogin = !showAdminLogin"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM4 21a8 8 0 0 1 16 0" />
            </svg>
            Вход администратора
          </button>
          <button v-else type="button" class="ghost-button" @click="logoutAdmin">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Выйти из админки
          </button>
          <button type="button" class="ghost-button" @click="resetAnonymousSession">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6" />
            </svg>
            Новая сессия
          </button>
        </div>
      </header>

      <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
      <div v-if="actionMessage" class="success-banner">{{ actionMessage }}</div>
      <div v-if="loading" class="loading-banner">Запрос выполняется…</div>

      <form v-if="showAdminLogin && !adminToken" class="admin-login" @submit.prevent="loginAdmin">
        <div>
          <span class="section-label">Администрирование</span>
          <h2>Вход администратора</h2>
        </div>
        <label>
          Логин
          <input v-model="adminLogin.username" data-testid="admin-login-username" autocomplete="username" />
        </label>
        <label>
          Пароль
          <input
            v-model="adminLogin.password"
            data-testid="admin-login-password"
            type="password"
            autocomplete="current-password"
          />
        </label>
        <button type="submit" class="primary-button" data-testid="admin-login-submit">Войти</button>
      </form>

      <div class="content-grid" :class="{ 'single-view': activeTab !== 'Чат' }">
        <section v-if="activeTab === 'Чат'" class="chat-panel" aria-label="Диалог">
          <div class="chat-stream">
            <article
              v-for="(message, index) in chatMessages"
              :key="`${message.author}-${index}`"
              class="message"
              :class="message.author"
            >
              <span>{{ message.author === 'bot' ? 'Ассистент' : 'Вы' }}</span>
              <p>{{ message.text }}</p>
            </article>
          </div>

          <form class="composer" @submit.prevent="sendMessage">
            <textarea
              v-model="form.text"
              rows="3"
              aria-label="Сообщение о состоянии"
              data-testid="chat-text"
            ></textarea>
            <div class="composer-actions">
              <button type="button" class="icon-button" title="Геолокация">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </button>
              <button type="submit" class="primary-button" data-testid="recommend-submit" :disabled="loading">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
                Подобрать
              </button>
            </div>
          </form>
        </section>

        <section v-if="activeTab === 'Чат'" class="parameter-panel" aria-label="Параметры подбора">
          <div class="panel-section">
            <h2>Параметры</h2>
            <label>
              Бюджет до {{ form.budget }} ₽
              <input v-model.number="form.budget" type="range" min="0" max="4000" step="100" />
            </label>
            <label>
              Когда
              <select v-model="form.time">
                <option>Сегодня вечером</option>
                <option>Завтра</option>
                <option>В выходные</option>
                <option>Онлайн</option>
              </select>
            </label>
            <label>
              Компания
              <select v-model="form.company">
                <option>одна/один</option>
                <option>с другом</option>
                <option>парой</option>
                <option>с компанией</option>
              </select>
            </label>
          </div>

          <div class="panel-section">
            <h2>Интересы</h2>
            <div class="chip-list">
              <button
                v-for="interest in interests"
                :key="interest"
                type="button"
                :class="{ selected: form.interests.includes(interest) }"
                @click="toggleInterest(interest)"
              >
                {{ interest }}
              </button>
            </div>
          </div>

          <div class="panel-section">
            <h2>Ограничения</h2>
            <textarea
              v-model="form.restrictions"
              rows="4"
              aria-label="Нежелательные темы и ограничения"
              placeholder="Например: поздно ночью, алкоголь, громкие места"
            ></textarea>
          </div>
        </section>

        <section
          v-if="activeTab === 'Чат' && recommendation && !isCarefulMode"
          class="recommendation-card"
          data-testid="recommendation-card"
          aria-label="Рекомендация"
        >
          <div class="card-head">
            <div>
              <span class="section-label">{{ statusLabel }}</span>
              <h2>{{ recommendation.title }}</h2>
            </div>
            <strong>{{ recommendation.score }}%</strong>
          </div>

          <dl class="event-meta">
            <div>
              <dt>Город</dt>
              <dd>{{ recommendation.city }}</dd>
            </div>
            <div>
              <dt>Адрес</dt>
              <dd>{{ recommendation.address }}</dd>
            </div>
            <div>
              <dt>Время</dt>
              <dd>{{ recommendation.dateTime }}</dd>
            </div>
            <div>
              <dt>Цена</dt>
              <dd>{{ recommendation.price }} ₽</dd>
            </div>
            <div>
              <dt>Возраст</dt>
              <dd>{{ recommendation.ageRestriction }}</dd>
            </div>
          </dl>

          <p class="explanation">{{ recommendation.explanation }}</p>
          <p class="safety-line">{{ recommendation.description }}</p>

          <div v-if="recommendation.budgetWarning" class="budget-warning">
            {{ recommendation.budgetWarning }}
          </div>

          <div class="card-actions">
            <a class="primary-button" :href="recommendation.sourceUrl" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9V6h16v3a3 3 0 0 0 0 6v3H4v-3a3 3 0 0 0 0-6z" />
              </svg>
              Источник
            </a>
            <a class="ghost-button" :href="recommendation.mapUrl" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2zM9 4v14M15 6v14" />
              </svg>
              Карта
            </a>
            <button
              type="button"
              class="ghost-button"
              data-testid="save-favorite"
              @click="saveCurrentRecommendation"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h12v17l-6-4-6 4z" />
              </svg>
              В избранное
            </button>
          </div>

          <div class="feedback-row" aria-label="Оценка рекомендации">
            <button
              type="button"
              :class="{ selected: feedbackChoice === 'good' }"
              @click="submitFeedback('good')"
            >
              Подходит
            </button>
            <button
              type="button"
              :class="{ selected: feedbackChoice === 'bad' }"
              @click="submitFeedback('bad')"
            >
              Не подходит
            </button>
            <select v-model="rejectionReason" aria-label="Причина отказа">
              <option value="">Причина отказа</option>
              <option v-for="reason in catalog.feedbackReasons" :key="reason">{{ reason }}</option>
            </select>
          </div>
        </section>

        <section
          v-if="activeTab === 'Чат' && isCarefulMode"
          class="view-panel compact-state"
          data-testid="careful-panel"
        >
          <h2>Бережный режим</h2>
          <p>{{ result.message }}</p>
        </section>

        <section v-if="activeTab === 'Чат' && isNoMatch" class="view-panel compact-state">
          <h2>Безопасный вариант не найден</h2>
          <p>{{ result.message }}</p>
        </section>

        <section v-if="activeTab === 'Чат'" class="alternatives-panel" aria-label="Альтернативы">
          <div class="panel-title">
            <h2>Альтернативы</h2>
            <button type="button" class="text-button" :disabled="!alternatives.length" @click="requestAlternatives">
              Учесть первый вариант
            </button>
          </div>
          <article v-for="event in alternatives" :key="event.id" class="alternative-row">
            <div>
              <strong>{{ event.title }}</strong>
              <span>{{ event.format }} · {{ event.price }} ₽ · {{ event.dateTime }}</span>
            </div>
            <button type="button" class="icon-button" title="Выбрать" @click="form.interests = [event.format]">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </article>
          <p v-if="!alternatives.length" class="empty-state">Альтернативы появятся после подбора.</p>
        </section>

        <section v-if="activeTab === 'Профиль'" class="view-panel">
          <h2>Профиль и параметры по умолчанию</h2>
          <div class="form-grid">
            <label>
              Город
              <select v-model="form.city">
                <option v-for="city in cities" :key="city">{{ city }}</option>
              </select>
            </label>
            <label>
              Возраст
              <input v-model.number="form.age" type="number" min="12" max="99" />
            </label>
            <label>
              Бюджет
              <input v-model.number="form.budget" type="number" min="0" />
            </label>
            <label class="full-span">
              Ограничения
              <textarea v-model="form.restrictions" rows="5"></textarea>
            </label>
          </div>
          <button type="button" class="primary-button" @click="updateProfile">Сохранить профиль</button>
        </section>

        <section v-if="activeTab === 'Избранное'" class="view-panel">
          <h2>Избранное</h2>
          <article v-for="favorite in favorites" :key="favorite.id" class="favorite-item">
            <strong>{{ favorite.event?.title || 'Событие недоступно' }}</strong>
            <span v-if="favorite.event">{{ favorite.event.dateTime }} · {{ favorite.event.address }}</span>
            <button type="button" class="text-button" @click="removeFavorite(favorite.id)">Удалить</button>
          </article>
          <p v-if="!favorites.length" class="empty-state">Сохранённые события появятся здесь.</p>
        </section>

        <section v-if="activeTab === 'История'" class="view-panel">
          <div class="panel-title">
            <h2>История рекомендаций</h2>
            <button type="button" class="danger-button" data-testid="clear-history" @click="clearHistory">
              Удалить историю
            </button>
          </div>
          <article v-for="item in history" :key="item.id" class="history-row">
            <strong>{{ item.status }}</strong>
            <span>{{ item.stateCategory }} · {{ new Date(item.createdAt).toLocaleString('ru-RU') }}</span>
          </article>
          <p v-if="!history.length" class="empty-state">История пуста или отключена в приватности.</p>
        </section>

        <section v-if="activeTab === 'Приватность'" class="view-panel">
          <h2>Приватность</h2>
          <p class="privacy-copy">
            Можно пользоваться без регистрации. По умолчанию сохраняются параметры подбора, а полный
            текст сообщений хранится только при отдельном согласии.
          </p>
          <label class="toggle-row">
            <input
              :checked="profile?.privacy.statisticsEnabled"
              type="checkbox"
              @change="updatePrivacy({ statisticsEnabled: $event.target.checked })"
            />
            <span>Анонимная статистика</span>
          </label>
          <label class="toggle-row">
            <input
              :checked="profile?.privacy.storeFullDialogText"
              type="checkbox"
              @change="updatePrivacy({ storeFullDialogText: $event.target.checked })"
            />
            <span>Хранить полный текст сообщений</span>
          </label>
          <label class="toggle-row">
            <input
              :checked="profile?.privacy.historyEnabled"
              type="checkbox"
              @change="updatePrivacy({ historyEnabled: $event.target.checked })"
            />
            <span>Сохранять историю рекомендаций</span>
          </label>
        </section>

        <section v-if="activeTab === 'Админ'" class="view-panel">
          <div class="panel-title">
            <h2>Администрирование</h2>
            <div class="card-actions">
              <span v-if="adminInfo" class="admin-user">Администратор: {{ adminInfo.username }}</span>
              <button type="button" class="ghost-button" @click="importDemoEvents">Импорт демо-источника</button>
            </div>
          </div>

          <div class="metric-grid">
            <span>События: {{ adminEvents.length }}</span>
            <span>Правила безопасности: {{ safetyRules.length }}</span>
            <span>Источники: {{ dataSources.length }}</span>
          </div>

          <div class="admin-tabs" aria-label="Разделы администрирования">
            <button type="button" :class="{ active: adminView === 'events' }" @click="adminView = 'events'">
              События
            </button>
            <button type="button" :class="{ active: adminView === 'rules' }" @click="adminView = 'rules'">
              Правила безопасности
            </button>
            <button type="button" :class="{ active: adminView === 'sources' }" @click="adminView = 'sources'">
              Источники
            </button>
          </div>

          <section
            v-if="adminView === 'events'"
            class="admin-section"
            data-testid="admin-events-section"
            aria-label="Администрирование событий"
          >
            <form class="admin-filter-grid" @submit.prevent="applyAdminFilters">
              <label>
                Город
                <select v-model="adminFilters.city">
                  <option value="">Все города</option>
                  <option v-for="city in cities" :key="city">{{ city }}</option>
                </select>
              </label>
              <label>
                Статус
                <select v-model="adminFilters.status" data-testid="admin-filter-status">
                  <option v-for="status in adminStatusOptions" :key="status.value" :value="status.value">
                    {{ status.label }}
                  </option>
                </select>
              </label>
              <label>
                Источник
                <select v-model="adminFilters.source">
                  <option value="">Все источники</option>
                  <option v-for="source in sourceOptions" :key="source.id" :value="source.id">
                    {{ source.name }}
                  </option>
                </select>
              </label>
              <label>
                Формат
                <select v-model="adminFilters.format">
                  <option value="">Все форматы</option>
                  <option v-for="format in interests" :key="format">{{ format }}</option>
                </select>
              </label>
              <button type="submit" class="primary-button" data-testid="admin-apply-filters">Применить</button>
            </form>

            <form class="admin-editor" @submit.prevent="saveAdminEvent">
              <div class="panel-title">
                <h3>{{ editingEventId ? 'Редактирование события' : 'Новое событие' }}</h3>
                <button v-if="editingEventId" type="button" class="text-button" @click="resetEventDraft">
                  Очистить форму
                </button>
              </div>
              <div class="admin-editor-grid">
                <label>
                  Название
                  <input v-model="adminDraft.title" data-testid="admin-event-title" required />
                </label>
                <label>
                  Город
                  <select v-model="adminDraft.city" data-testid="admin-event-city" required>
                    <option v-for="city in cities" :key="city">{{ city }}</option>
                  </select>
                </label>
                <label>
                  Адрес
                  <input v-model="adminDraft.address" data-testid="admin-event-address" />
                </label>
                <label>
                  Время
                  <input v-model="adminDraft.dateTime" data-testid="admin-event-date-time" />
                </label>
                <label>
                  Цена
                  <input v-model.number="adminDraft.price" data-testid="admin-event-price" type="number" min="0" />
                </label>
                <label>
                  Возраст
                  <input v-model="adminDraft.ageRestriction" />
                </label>
                <label>
                  Формат
                  <select v-model="adminDraft.format">
                    <option v-for="format in interests" :key="format">{{ format }}</option>
                  </select>
                </label>
                <label>
                  Стратегия
                  <select v-model="adminDraft.strategyId">
                    <option v-for="strategy in strategies" :key="strategy.id" :value="strategy.id">
                      {{ strategy.title }}
                    </option>
                  </select>
                </label>
                <label>
                  Источник
                  <select v-model="adminDraft.source">
                    <option v-for="source in sourceOptions" :key="source.id" :value="source.id">
                      {{ source.name }}
                    </option>
                  </select>
                </label>
                <label>
                  Статус
                  <select v-model="adminDraft.moderationStatus">
                    <option v-for="status in moderationStatusOptions" :key="status.value" :value="status.value">
                      {{ status.label }}
                    </option>
                  </select>
                </label>
                <label>
                  Ссылка на источник
                  <input v-model="adminDraft.sourceUrl" />
                </label>
                <label>
                  Ссылка на карту
                  <input v-model="adminDraft.mapUrl" />
                </label>
                <label class="full-span">
                  Описание
                  <textarea v-model="adminDraft.description" data-testid="admin-event-description" rows="4"></textarea>
                </label>
                <label>
                  Теги через запятую
                  <input v-model="adminDraft.tagsText" />
                </label>
                <label>
                  Теги безопасности через запятую
                  <input v-model="adminDraft.safetyTagsText" />
                </label>
              </div>
              <button type="submit" class="primary-button" data-testid="admin-save-event">
                {{ editingEventId ? 'Сохранить событие' : 'Добавить событие' }}
              </button>
            </form>

            <label class="moderation-reason">
              Причина модерации
              <input v-model="moderationReason" placeholder="Необязательно" />
            </label>

            <div class="admin-table" role="table" aria-label="События на модерации">
              <div class="admin-row head" role="row">
                <span>Событие</span>
                <span>Источник</span>
                <span>Риск</span>
                <span>Статус</span>
                <span>Действия</span>
              </div>
              <div v-for="event in adminEvents" :key="event.id" class="admin-row" role="row">
                <span>
                  <strong>{{ event.title }}</strong>
                  <small>{{ event.city }} · {{ event.format }} · {{ event.price }} ₽</small>
                </span>
                <span>{{ sourceName(event.source) }}</span>
                <span>{{ event.safetyTags?.join(', ') || 'низкий' }}</span>
                <span>
                  {{ statusText(event.moderationStatus) }}
                  <small v-if="event.moderatedBy"> {{ event.moderatedBy }}</small>
                </span>
                <span class="table-actions">
                  <button type="button" class="text-button" data-testid="admin-edit-event" @click="editEvent(event)">
                    Редактировать
                  </button>
                  <button
                    type="button"
                    class="text-button"
                    data-testid="admin-approve-event"
                    @click="moderateEvent(event, 'approved')"
                  >
                    Одобрить
                  </button>
                  <button
                    type="button"
                    class="text-button"
                    data-testid="admin-reject-event"
                    @click="moderateEvent(event, 'rejected')"
                  >
                    Отклонить
                  </button>
                </span>
              </div>
            </div>
          </section>

          <section v-if="adminView === 'rules'" class="admin-section" aria-label="Правила безопасности">
            <form class="admin-editor" @submit.prevent="saveSafetyRule">
              <div class="panel-title">
                <h3>{{ editingRuleId ? 'Редактирование правила' : 'Новое правило безопасности' }}</h3>
                <button v-if="editingRuleId" type="button" class="text-button" @click="resetRuleDraft">
                  Очистить форму
                </button>
              </div>
              <div class="admin-editor-grid">
                <label>
                  Название
                  <input v-model="ruleDraft.title" required />
                </label>
                <label>
                  Тип
                  <select v-model="ruleDraft.type">
                    <option v-for="type in ruleTypeOptions" :key="type.value" :value="type.value">
                      {{ type.label }}
                    </option>
                  </select>
                </label>
                <label>
                  Серьёзность
                  <select v-model="ruleDraft.severity">
                    <option v-for="severity in severityOptions" :key="severity.value" :value="severity.value">
                      {{ severity.label }}
                    </option>
                  </select>
                </label>
                <label class="toggle-row admin-toggle">
                  <input v-model="ruleDraft.enabled" type="checkbox" />
                  <span>Правило включено</span>
                </label>
                <label class="full-span">
                  Шаблон
                  <input v-model="ruleDraft.pattern" required />
                </label>
              </div>
              <button type="submit" class="primary-button">
                {{ editingRuleId ? 'Сохранить правило' : 'Добавить правило' }}
              </button>
            </form>

            <div class="admin-list">
              <article v-for="rule in safetyRules" :key="rule.id" class="admin-list-item">
                <div>
                  <strong>{{ rule.title }}</strong>
                  <span>{{ rule.type }} · {{ rule.severity }} · {{ boolText(rule.enabled) }}</span>
                  <small>{{ rule.pattern }}</small>
                </div>
                <button type="button" class="text-button" @click="editSafetyRule(rule)">Редактировать</button>
              </article>
            </div>
          </section>

          <section v-if="adminView === 'sources'" class="admin-section" aria-label="Источники данных">
            <form class="admin-editor" @submit.prevent="saveDataSource">
              <div class="panel-title">
                <h3>{{ editingSourceId ? 'Редактирование источника' : 'Выберите источник для редактирования' }}</h3>
                <button v-if="editingSourceId" type="button" class="text-button" @click="resetSourceDraft">
                  Очистить форму
                </button>
              </div>
              <div class="admin-editor-grid">
                <label>
                  Название
                  <input v-model="sourceDraft.name" required :disabled="!editingSourceId" />
                </label>
                <label>
                  Тип
                  <select v-model="sourceDraft.type" :disabled="!editingSourceId">
                    <option>manual</option>
                    <option>external</option>
                  </select>
                </label>
                <label>
                  Доверие
                  <select v-model="sourceDraft.trustLevel" :disabled="!editingSourceId">
                    <option v-for="level in trustLevelOptions" :key="level.value" :value="level.value">
                      {{ level.label }}
                    </option>
                  </select>
                </label>
                <label class="toggle-row admin-toggle">
                  <input v-model="sourceDraft.enabled" type="checkbox" :disabled="!editingSourceId" />
                  <span>Источник включен</span>
                </label>
              </div>
              <button type="submit" class="primary-button" :disabled="!editingSourceId">
                Сохранить источник
              </button>
            </form>

            <div class="admin-list">
              <article v-for="source in dataSources" :key="source.id" class="admin-list-item">
                <div>
                  <strong>{{ source.name }}</strong>
                  <span>{{ source.type }} · доверие: {{ source.trustLevel }} · {{ boolText(source.enabled) }}</span>
                </div>
                <button type="button" class="text-button" @click="editDataSource(source)">Редактировать</button>
              </article>
            </div>
          </section>
        </section>
      </div>

      <footer class="status-strip">
        <span>Статус: {{ statusLabel }}</span>
        <span>Город: {{ form.city }}</span>
        <span>Форматы: {{ form.interests.join(', ') || 'без предпочтений' }}</span>
      </footer>
    </section>
  </main>
</template>
