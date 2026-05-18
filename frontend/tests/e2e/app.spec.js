import { expect, test } from 'playwright/test'

async function resetSession(page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Подбор безопасного культурного выхода' })).toBeVisible()
}

async function requestRecommendation(page, text) {
  await page.getByTestId('chat-text').fill(text)
  await page.getByTestId('recommend-submit').click()
}

test('regular user can get a recommendation, save it, and clear history', async ({ page }) => {
  await resetSession(page)

  await expect(page.getByRole('button', { name: 'Админ', exact: true })).toHaveCount(0)

  await requestRecommendation(page, 'устала после учебы, хочу спокойно куда-то выбраться')
  await expect(page.getByTestId('recommendation-card')).toBeVisible()

  await page.getByTestId('save-favorite').click()
  await expect(page.getByText('Сохранено в избранное.')).toBeVisible()

  await page.getByRole('button', { name: 'Избранное', exact: true }).click()
  await expect(page.getByText('Камерный спектакль «Тихий вечер»')).toBeVisible()

  await page.getByRole('button', { name: 'История', exact: true }).click()
  await expect(page.locator('.history-row')).toHaveCount(1)
  await page.getByTestId('clear-history').click()
  await expect(page.getByText('История удалена.')).toBeVisible()
  await expect(page.getByText('История пуста или отключена в приватности.')).toBeVisible()
})

test('potentially dangerous text opens careful mode instead of event recommendation', async ({ page }) => {
  await resetSession(page)

  await requestRecommendation(page, 'есть мысли про самоповреждение')
  await expect(page.getByTestId('careful-panel')).toBeVisible()
  await expect(page.getByTestId('recommendation-card')).toHaveCount(0)
})

test('administrator can login, filter events, edit and moderate an event', async ({ page }) => {
  await resetSession(page)

  await page.getByTestId('admin-login-toggle').click()
  await page.getByTestId('admin-login-username').fill('admin')
  await page.getByTestId('admin-login-password').fill('admin')
  await page.getByTestId('admin-login-submit').click()

  await expect(page.getByRole('button', { name: 'Админ', exact: true })).toBeVisible()
  await expect(page.getByTestId('admin-events-section')).toBeVisible()

  await page.getByTestId('admin-filter-status').selectOption('pending')
  await page.getByTestId('admin-apply-filters').click()
  await expect(page.getByText('Тестовое E2E событие')).toHaveCount(0)

  await page.getByTestId('admin-event-title').fill('Тестовое E2E событие')
  await page.getByTestId('admin-event-city').selectOption('Владивосток')
  await page.getByTestId('admin-event-address').fill('ул. Проверочная, 7')
  await page.getByTestId('admin-event-date-time').fill('Пятница, 18:00')
  await page.getByTestId('admin-event-price').fill('800')
  await page.getByTestId('admin-event-description').fill('Событие для проверки админского сценария.')
  await page.getByTestId('admin-save-event').click()

  await expect(page.getByText('Событие добавлено в очередь модерации.')).toBeVisible()
  await expect(page.getByText('Тестовое E2E событие')).toBeVisible()

  await page.getByTestId('admin-edit-event').first().click()
  await page.getByTestId('admin-event-title').fill('Тестовое E2E событие обновлено')
  await page.getByTestId('admin-save-event').click()
  await expect(page.getByText('Событие обновлено.')).toBeVisible()
  await expect(page.getByText('Тестовое E2E событие обновлено')).toBeVisible()

  await page.getByTestId('admin-approve-event').first().click()
  await expect(page.getByText('Событие одобрено.')).toBeVisible()
})
