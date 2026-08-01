import { test, expect } from './fixtures.js'
import { createLane, laneLocator, quickAddCard } from './pageHelpers.js'

test.describe('card management', () => {
  test('creates a card in a lane', async ({ page }) => {
    await createLane(page, 'Work')
    const workLane = laneLocator(page, 'Work')

    await workLane.getByRole('button', { name: 'More options for new card' }).click()
    await page.getByPlaceholder('Task name').fill('Write report')
    await page.getByPlaceholder('Add any details (optional)').fill('Quarterly summary')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(workLane.getByText('Write report')).toBeVisible()
    await expect(workLane.getByText('Quarterly summary')).toBeVisible()
    await expect(workLane.getByText('To do')).toBeVisible()
  })

  test('edits an existing card', async ({ page }) => {
    await createLane(page, 'Work')
    const workLane = laneLocator(page, 'Work')

    await quickAddCard(page, workLane, 'Draft plan')

    await workLane.getByText('Draft plan').click()
    await page.getByPlaceholder('Task name').fill('Draft plan v2')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(workLane.getByText('Draft plan v2')).toBeVisible()
    await expect(workLane.getByText('Draft plan', { exact: true })).not.toBeVisible()
  })

  test('deletes a card', async ({ page }) => {
    await createLane(page, 'Work')
    const workLane = laneLocator(page, 'Work')

    await quickAddCard(page, workLane, 'Throwaway task')

    await workLane.getByText('Throwaway task').click()
    await page.locator('.card-modal__delete').click()
    await page.locator('.card-modal__delete').click()

    await expect(workLane.getByText('Throwaway task')).not.toBeVisible()
  })

  test('setting status to DELAYED moves the card into the Delayed lane', async ({ page }) => {
    await createLane(page, 'Work')
    const workLane = laneLocator(page, 'Work')
    const delayedLane = laneLocator(page, 'Delayed')

    await quickAddCard(page, workLane, 'Blocked task')

    await workLane.getByText('Blocked task').click()
    await page.locator('select').first().selectOption('DELAYED')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(delayedLane.getByText('Blocked task')).toBeVisible()
    await expect(workLane.getByText('Blocked task')).not.toBeVisible()
  })

  test('setting status to COMPLETED moves the card into the Completed lane', async ({ page }) => {
    await createLane(page, 'Work')
    const workLane = laneLocator(page, 'Work')
    const completedLane = laneLocator(page, 'Completed')

    await quickAddCard(page, workLane, 'Finished task')

    await workLane.getByText('Finished task').click()
    await page.locator('select').first().selectOption('COMPLETED')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(completedLane.getByText('Finished task')).toBeVisible()
    await expect(workLane.getByText('Finished task')).not.toBeVisible()
  })
})
