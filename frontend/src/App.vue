<script setup>
import { computed, ref } from 'vue'

const cities = ['Владивосток', 'Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск']
const interests = ['театр', 'выставки', 'мастер-классы', 'танцы', 'импровизация', 'дискуссии']
const companyFormats = ['одна/один', 'с другом', 'парой', 'с компанией']
const tabs = ['Чат', 'Профиль', 'Избранное', 'Приватность', 'Админ']

const events = [
  {
    id: 1,
    title: 'Камерный спектакль «Тихий вечер»',
    city: 'Владивосток',
    address: 'ул. Светланская, 15',
    date: 'Сегодня, 19:30',
    price: 900,
    age: '16+',
    category: 'театр',
    strategy: 'Эмоциональное восстановление',
    safety: 'Спокойная постановка без позднего окончания и резких тем.',
    reason:
      'Подходит, если хочется мягко выйти из учебной усталости: камерный зал, понятная дорога, невысокая цена и формат без давления на общение.',
    source: 'Афиша театра',
    status: 'проверено',
    score: 96,
  },
  {
    id: 2,
    title: 'Открытая мастерская голоса',
    city: 'Владивосток',
    address: 'Океанский пр-т, 28',
    date: 'Завтра, 18:00',
    price: 1200,
    age: '18+',
    category: 'вокал',
    strategy: 'Уверенность и навык',
    safety: 'Дневной формат, малые группы, понятная запись.',
    reason: 'Небольшая группа и телесная практика помогают переключиться без соревновательного настроя.',
    source: 'Timepad',
    status: 'на модерации',
    score: 84,
  },
  {
    id: 3,
    title: 'Выставка «Линия берега»',
    city: 'Владивосток',
    address: 'Партизанский пр-т, 12',
    date: 'Ежедневно до 21:00',
    price: 500,
    age: '12+',
    category: 'выставки',
    strategy: 'Спокойная смена обстановки',
    safety: 'Можно прийти одной/одному, нет жесткого расписания.',
    reason: 'Хороший запасной вариант, если не хочется долго сидеть в зале или нужно больше свободы.',
    source: '2ГИС',
    status: 'проверено',
    score: 79,
  },
]

const activeTab = ref('Чат')
const selectedCity = ref('Владивосток')
const messageText = ref('устала после учебы, хочу спокойно куда-то выбраться')
const budget = ref(1500)
const age = ref(22)
const time = ref('Сегодня вечером')
const company = ref('одна/один')
const selectedInterests = ref(['театр', 'выставки'])
const unwanted = ref('поздно ночью, алкогольные вечеринки, громкие места')
const carefulMode = ref(false)
const feedback = ref('')
const rejectionReason = ref('')
const saved = ref(false)
const consentStats = ref(true)
const consentText = ref(false)
const historyEnabled = ref(true)
const chatMessages = ref([
  {
    author: 'bot',
    text: 'Расскажи, где ты сейчас и какого отдыха хочется. Я подберу один безопасный культурный вариант без оценок и диагнозов.',
  },
  {
    author: 'user',
    text: 'Владивосток. Устала после учебы, хочу спокойно куда-то выбраться. Бюджет до 1500 ₽.',
  },
  {
    author: 'bot',
    text: 'Поняла. Смотрю спокойные форматы на вечер, без позднего окончания, с понятной дорогой и возрастным ограничением.',
  },
])

const bestEvent = computed(() => {
  const byCity = events.filter((event) => event.city === selectedCity.value)
  const affordable = byCity.filter((event) => event.price <= budget.value)
  return affordable.find((event) => selectedInterests.value.includes(event.category)) || affordable[0] || byCity[0]
})

const alternatives = computed(() => events.filter((event) => event.id !== bestEvent.value?.id).slice(0, 2))

const stateCategory = computed(() => {
  const text = messageText.value.toLowerCase()

  if (carefulMode.value || /самоповреж|суицид|насили|опасност|зависимост/.test(text)) {
    return 'режим бережной поддержки'
  }

  if (/устал|выгор|нет сил|перегруз/.test(text)) {
    return 'усталость'
  }

  if (/тревог|паник|страш/.test(text)) {
    return 'тревога'
  }

  if (/одинок|никого/.test(text)) {
    return 'одиночество'
  }

  return 'желание сменить обстановку'
})

const strategy = computed(() => {
  if (stateCategory.value === 'режим бережной поддержки') {
    return 'Сначала безопасность и поддержка'
  }

  if (['усталость', 'тревога', 'желание сменить обстановку'].includes(stateCategory.value)) {
    return 'Эмоциональное облегчение и восстановление'
  }

  return 'Социальный контакт в безопасном формате'
})

const moderationRows = computed(() =>
  events.map((event) => ({
    title: event.title,
    source: event.source,
    risk: event.status === 'проверено' ? 'низкий' : 'требует проверки',
    status: event.status,
  })),
)

function toggleInterest(interest) {
  if (selectedInterests.value.includes(interest)) {
    selectedInterests.value = selectedInterests.value.filter((item) => item !== interest)
    return
  }

  selectedInterests.value = [...selectedInterests.value, interest]
}

function sendMessage() {
  const text = messageText.value.trim()

  if (!text) {
    return
  }

  chatMessages.value = [
    ...chatMessages.value,
    { author: 'user', text },
    {
      author: 'bot',
      text:
        stateCategory.value === 'режим бережной поддержки'
          ? 'Похоже, сейчас важнее не выбирать событие, а не оставаться с этим одной/одному. Лучше обратиться к близкому человеку, специалисту или в экстренную службу по месту нахождения.'
          : `Я отношу это к категории «${stateCategory.value}» и выбираю стратегию «${strategy.value}». Ниже один самый подходящий вариант.`,
    },
  ]
}

function requestAlternative() {
  rejectionReason.value = rejectionReason.value || 'хочу другой формат'
  chatMessages.value = [
    ...chatMessages.value,
    {
      author: 'bot',
      text: 'Хорошо, покажу более свободный формат и не буду предлагать похожее без причины.',
    },
  ]
}
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
          <select v-model="selectedCity">
            <option v-for="city in cities" :key="city">{{ city }}</option>
          </select>
        </label>
        <label>
          Возраст
          <input v-model.number="age" type="number" min="12" max="99" />
        </label>
      </section>

      <section class="safety-note">
        <strong>Безопасный режим</strong>
        <p>
          При признаках непосредственной опасности сервис не подбирает досуг и мягко
          направляет к живой помощи.
        </p>
      </section>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <h1>Подбор спокойного культурного выхода</h1>
          <p>Один лучший вариант с учетом состояния, бюджета, времени и ограничений.</p>
        </div>
        <button type="button" class="ghost-button" @click="carefulMode = !carefulMode">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l7 4v5c0 4.5-2.9 7.9-7 9-4.1-1.1-7-4.5-7-9V7z" />
          </svg>
          {{ carefulMode ? 'Поддержка включена' : 'Проверить риски' }}
        </button>
      </header>

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
            <textarea v-model="messageText" rows="3" aria-label="Сообщение о состоянии"></textarea>
            <div class="composer-actions">
              <button type="button" class="icon-button" title="Геолокация">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </button>
              <button type="submit" class="primary-button">
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
              Бюджет до {{ budget }} ₽
              <input v-model.number="budget" type="range" min="0" max="4000" step="100" />
            </label>
            <label>
              Когда
              <select v-model="time">
                <option>Сегодня вечером</option>
                <option>Завтра</option>
                <option>В выходные</option>
                <option>Онлайн</option>
              </select>
            </label>
            <label>
              Компания
              <select v-model="company">
                <option v-for="format in companyFormats" :key="format">{{ format }}</option>
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
                :class="{ selected: selectedInterests.includes(interest) }"
                @click="toggleInterest(interest)"
              >
                {{ interest }}
              </button>
            </div>
          </div>

          <div class="panel-section">
            <h2>Ограничения</h2>
            <textarea v-model="unwanted" rows="4" aria-label="Нежелательные форматы"></textarea>
          </div>
        </section>

        <section
          v-if="activeTab === 'Чат' && bestEvent"
          class="recommendation-card"
          aria-label="Рекомендация"
        >
          <div class="card-head">
            <div>
              <span class="section-label">Лучшая рекомендация</span>
              <h2>{{ bestEvent.title }}</h2>
            </div>
            <strong>{{ bestEvent.score }}%</strong>
          </div>

          <dl class="event-meta">
            <div>
              <dt>Город</dt>
              <dd>{{ bestEvent.city }}</dd>
            </div>
            <div>
              <dt>Адрес</dt>
              <dd>{{ bestEvent.address }}</dd>
            </div>
            <div>
              <dt>Время</dt>
              <dd>{{ bestEvent.date }}</dd>
            </div>
            <div>
              <dt>Цена</dt>
              <dd>{{ bestEvent.price }} ₽</dd>
            </div>
            <div>
              <dt>Возраст</dt>
              <dd>{{ bestEvent.age }}</dd>
            </div>
          </dl>

          <p class="explanation">{{ bestEvent.reason }}</p>
          <p class="safety-line">{{ bestEvent.safety }}</p>

          <div v-if="bestEvent.price > budget" class="budget-warning">
            Выше бюджета. Показать только с вашего согласия.
          </div>

          <div class="card-actions">
            <a class="primary-button" href="#" aria-label="Открыть билет">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9V6h16v3a3 3 0 0 0 0 6v3H4v-3a3 3 0 0 0 0-6z" />
              </svg>
              Билет
            </a>
            <a class="ghost-button" href="#" aria-label="Открыть карту">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2zM9 4v14M15 6v14" />
              </svg>
              Карта
            </a>
            <button type="button" class="ghost-button" @click="saved = !saved">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h12v17l-6-4-6 4z" />
              </svg>
              {{ saved ? 'Сохранено' : 'В избранное' }}
            </button>
          </div>

          <div class="feedback-row" aria-label="Оценка рекомендации">
            <button type="button" :class="{ selected: feedback === 'good' }" @click="feedback = 'good'">
              Подходит
            </button>
            <button type="button" :class="{ selected: feedback === 'bad' }" @click="feedback = 'bad'">
              Не подходит
            </button>
            <select v-model="rejectionReason" aria-label="Причина отказа">
              <option value="">Причина отказа</option>
              <option>дорого</option>
              <option>неинтересно</option>
              <option>неудобное время</option>
              <option>не тот формат</option>
            </select>
          </div>
        </section>

        <section v-if="activeTab === 'Чат'" class="alternatives-panel" aria-label="Альтернативы">
          <div class="panel-title">
            <h2>Альтернативы</h2>
            <button type="button" class="text-button" @click="requestAlternative">Еще вариант</button>
          </div>
          <article v-for="event in alternatives" :key="event.id" class="alternative-row">
            <div>
              <strong>{{ event.title }}</strong>
              <span>{{ event.category }} · {{ event.price }} ₽ · {{ event.date }}</span>
            </div>
            <button type="button" class="icon-button" title="Выбрать">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </article>
        </section>

        <section v-if="activeTab === 'Профиль'" class="view-panel">
          <h2>Профиль</h2>
          <div class="form-grid">
            <label>
              Город по умолчанию
              <select v-model="selectedCity">
                <option v-for="city in cities" :key="city">{{ city }}</option>
              </select>
            </label>
            <label>
              Бюджет
              <input v-model.number="budget" type="number" min="0" />
            </label>
            <label class="full-span">
              Нежелательные форматы
              <textarea v-model="unwanted" rows="5"></textarea>
            </label>
          </div>
        </section>

        <section v-if="activeTab === 'Избранное'" class="view-panel">
          <h2>Избранное</h2>
          <article class="favorite-item">
            <strong>{{ saved ? bestEvent.title : 'Пока ничего не сохранено' }}</strong>
            <span v-if="saved">{{ bestEvent.date }} · {{ bestEvent.address }}</span>
            <p v-else>Сохраненные события появятся здесь после выбора рекомендации.</p>
          </article>
        </section>

        <section v-if="activeTab === 'Приватность'" class="view-panel">
          <h2>Приватность</h2>
          <label class="toggle-row">
            <input v-model="consentStats" type="checkbox" />
            <span>Анонимная статистика</span>
          </label>
          <label class="toggle-row">
            <input v-model="consentText" type="checkbox" />
            <span>Хранить полный текст сообщений</span>
          </label>
          <label class="toggle-row">
            <input v-model="historyEnabled" type="checkbox" />
            <span>История рекомендаций</span>
          </label>
          <button type="button" class="danger-button">Удалить историю</button>
        </section>

        <section v-if="activeTab === 'Админ'" class="view-panel">
          <h2>Модерация событий</h2>
          <div class="admin-table" role="table" aria-label="События на модерации">
            <div class="admin-row head" role="row">
              <span>Событие</span>
              <span>Источник</span>
              <span>Риск</span>
              <span>Статус</span>
            </div>
            <div v-for="row in moderationRows" :key="row.title" class="admin-row" role="row">
              <span>{{ row.title }}</span>
              <span>{{ row.source }}</span>
              <span>{{ row.risk }}</span>
              <span>{{ row.status }}</span>
            </div>
          </div>
        </section>
      </div>

      <footer class="status-strip">
        <span>Категория: {{ stateCategory }}</span>
        <span>Стратегия: {{ strategy }}</span>
        <span>Формат: {{ selectedInterests.join(', ') || 'без предпочтений' }}</span>
      </footer>
    </section>
  </main>
</template>
