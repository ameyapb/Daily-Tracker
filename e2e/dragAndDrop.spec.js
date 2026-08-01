import { test, expect } from './fixtures.js'
import { createLane, laneLocator, quickAddCard } from './pageHelpers.js'

async function dragCardBetweenLanes(page, cardText, fromBoundingBox, toBoundingBox) {
  const card = page.locator('.card').filter({ hasText: cardText })
  const cardBox = await card.boundingBox()

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(fromBoundingBox.x + fromBoundingBox.width / 2, fromBoundingBox.y + fromBoundingBox.height / 2, {
    steps: 5,
  })
  await page.mouse.move(toBoundingBox.x + toBoundingBox.width / 2, toBoundingBox.y + toBoundingBox.height / 2, {
    steps: 10,
  })
  await page.mouse.up()
}

test.describe('drag and drop', () => {
  test('dragging a card to another lane moves it without changing status', async ({ page }) => {
    await createLane(page, 'Backlog')
    await createLane(page, 'In Review')

    const backlogLane = laneLocator(page, 'Backlog')
    const inReviewLane = laneLocator(page, 'In Review')

    await quickAddCard(page, backlogLane, 'Design homepage')

    const backlogBox = await backlogLane.boundingBox()
    const inReviewBox = await inReviewLane.boundingBox()

    await dragCardBetweenLanes(page, 'Design homepage', backlogBox, inReviewBox)

    await expect(inReviewLane.getByText('Design homepage')).toBeVisible()
    await expect(backlogLane.getByText('Design homepage')).not.toBeVisible()
    await expect(inReviewLane.getByText('To do')).toBeVisible()
  })
})
