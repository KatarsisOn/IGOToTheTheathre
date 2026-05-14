<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, getSessionId, resetSessionId } from './services/api'

const tabs = ['Чат', 'Профиль', 'Избранное', 'История', 'Приватность', 'Админ']
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
})

const ruleDraft = ref({
  title: 'Громкий ночной формат',
  type: 'event',
  pattern: 'громк|рейв|ночн',
  severity: 'medium',
  enabled: true,
})

const chatMessages = ref([
  {
    author: 'bot',
    text: 'Расскажи, где ты сейчас и какого отдыха хочется. Я подберу один безопасный культурный вариант без диагнозов и давления.',
  },
])

const cities = computed(() => catalog.value.cities.map((city) => city.name))
const interests = computed(() => catalog.value.leisureFormats)
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
  const [events, rules, sources] = await Promise.all([
    api.getAdminEvents(''),
    api.getSafetyRules(),
    api.getDataSources(),
  ])
  adminEvents.value = events
  safetyRules.value = rules
  dataSources.value = sources
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
    await Promise.all([refreshUserData(), refreshAdminData()])
  } catch (error) {
    apiStatus.value = 'недоступен'
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
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

async function createEvent() {
  try {
    await api.createAdminEvent(adminDraft.value)
    actionMessage.value = 'Событие добавлено в очередь модерации.'
    await refreshAdminData()
  } catch (error) {
    errorMessage.value = error.message
  }
}

async function moderateEvent(event, status) {
  await api.moderateEvent(event.id, { status })
  await refreshAdminData()
}

async function createSafetyRule() {
  try {
    await api.createSafetyRule(ruleDraft.value)
    actionMessage.value = 'Safety rule добавлено.'
    await refreshAdminData()
  } catch (error) {
    errorMessage.value = error.message
  }
}

async function importDemoEvents() {
  const response = await api.importDemoEvents()
  actionMessage.value = `Импортировано: ${response.imported.length}, дубликатов: ${response.duplicates.length}.`
  await refreshAdminData()
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
        <p>Сессия: {{ sessionId.slice(0, 8) }}. При кризисных сигналах рекомендации блокируются.</p>
      </section>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <h1>Подбор безопасного культурного выхода</h1>
          <p>Чат, рекомендации, история, избранное, приватность и админ-модерация работают через backend API.</p>
        </div>
        <button type="button" class="ghost-button" @click="resetAnonymousSession">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6" />
          </svg>
          Новая сессия
        </button>
      </header>

      <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
      <div v-if="actionMessage" class="success-banner">{{ actionMessage }}</div>
      <div v-if="loading" class="loading-banner">Запрос выполняется…</div>

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
            <textarea v-model="form.text" rows="3" aria-label="Сообщение о состоянии"></textarea>
            <div class="composer-actions">
              <button type="button" class="icon-button" title="Геолокация">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </button>
              <button type="submit" class="primary-button" :disabled="loading">
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
            <button type="button" class="ghost-button" @click="saveCurrentRecommendation">
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

        <section v-if="activeTab === 'Чат' && isCarefulMode" class="view-panel compact-state">
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
            <button type="button" class="danger-button" @click="clearHistory">Удалить историю</button>
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
            <button type="button" class="ghost-button" @click="importDemoEvents">Импорт демо-источника</button>
          </div>

          <div class="metric-grid">
            <span>События: {{ adminEvents.length }}</span>
            <span>Safety rules: {{ safetyRules.length }}</span>
            <span>Источники: {{ dataSources.length }}</span>
          </div>

          <form class="mini-form" @submit.prevent="createEvent">
            <label>
              Новое событие
              <input v-model="adminDraft.title" />
            </label>
            <label>
              Формат
              <select v-model="adminDraft.format">
                <option v-for="format in interests" :key="format">{{ format }}</option>
              </select>
            </label>
            <label>
              Цена
              <input v-model.number="adminDraft.price" type="number" min="0" />
            </label>
            <button type="submit" class="primary-button">Добавить</button>
          </form>

          <div class="admin-table" role="table" aria-label="События на модерации">
            <div class="admin-row head" role="row">
              <span>Событие</span>
              <span>Источник</span>
              <span>Риск</span>
              <span>Статус</span>
              <span>Действия</span>
            </div>
            <div v-for="event in adminEvents" :key="event.id" class="admin-row" role="row">
              <span>{{ event.title }}</span>
              <span>{{ event.source }}</span>
              <span>{{ event.safetyTags?.join(', ') || 'низкий' }}</span>
              <span>{{ event.moderationStatus }}</span>
              <span class="table-actions">
                <button type="button" class="text-button" @click="moderateEvent(event, 'approved')">ok</button>
                <button type="button" class="text-button" @click="moderateEvent(event, 'rejected')">reject</button>
              </span>
            </div>
          </div>

          <form class="mini-form" @submit.prevent="createSafetyRule">
            <label>
              Safety rule
              <input v-model="ruleDraft.title" />
            </label>
            <label>
              Pattern
              <input v-model="ruleDraft.pattern" />
            </label>
            <button type="submit" class="ghost-button">Добавить правило</button>
          </form>
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
