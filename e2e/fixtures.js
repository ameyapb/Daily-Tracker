import { test as base, expect } from '@playwright/test'
import { resetTestDatabase } from './testDbClient.js'

export const test = base.extend({
  page: async ({ page }, use) => {
    await resetTestDatabase()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await use(page)
  },
})

export { expect }
