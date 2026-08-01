import { test, expect } from './fixtures.js'

test.describe('lane management', () => {
  test('creates a new lane', async ({ page }) => {
    await page.getByLabel('New lane name').fill('Work')
    await page.getByRole('button', { name: 'Add lane' }).click()

    await expect(page.getByText('Work', { exact: true })).toBeVisible()
  })

  test('renames a lane via double-click', async ({ page }) => {
    await page.getByLabel('New lane name').fill('Work')
    await page.getByRole('button', { name: 'Add lane' }).click()

    const laneName = page.getByText('Work', { exact: true })
    await laneName.dblclick()

    const renameInput = page.locator('.lane__name-input')
    await renameInput.fill('Personal')
    await renameInput.press('Enter')

    await expect(page.getByText('Personal', { exact: true })).toBeVisible()
    await expect(page.getByText('Work', { exact: true })).not.toBeVisible()
  })

  test('deletes a user lane', async ({ page }) => {
    await page.getByLabel('New lane name').fill('Temporary')
    await page.getByRole('button', { name: 'Add lane' }).click()
    await expect(page.getByText('Temporary', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Delete lane Temporary' }).click()

    await expect(page.getByText('Temporary', { exact: true })).not.toBeVisible()
  })

  test('system lanes Delayed and Completed are always present and not deletable', async ({ page }) => {
    await expect(page.getByText('Delayed', { exact: true })).toBeVisible()
    await expect(page.getByText('Completed', { exact: true })).toBeVisible()

    await expect(page.getByRole('button', { name: 'Delete lane Delayed' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Delete lane Completed' })).toHaveCount(0)
  })
})
