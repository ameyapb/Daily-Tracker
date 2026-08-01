import { expect } from '@playwright/test'

export async function createLane(page, name) {
  await page.getByLabel('New lane name').fill(name)
  await page.getByRole('button', { name: 'Add lane' }).click()
  await expect(page.getByText(name, { exact: true })).toBeVisible()
}

export function laneLocator(page, name) {
  return page.locator('.lane').filter({ has: page.getByText(name, { exact: true }) })
}

export async function quickAddCard(page, laneLocatorForLane, name) {
  await laneLocatorForLane.getByPlaceholder('Add a card...').fill(name)
  await laneLocatorForLane.getByPlaceholder('Add a card...').press('Enter')
  await expect(laneLocatorForLane.getByText(name, { exact: true })).toBeVisible()
}
