import { test, expect } from './fixtures.js'
import { createLane, laneLocator, quickAddCard } from './pageHelpers.js'

const USER_LANE_SELECTOR = '.lane:not(.lane--overlay):not(.lane--delayed):not(.lane--completed)'

function userLaneNames(page) {
  return page.locator(`${USER_LANE_SELECTOR} .lane__name`)
}

// Drags the lane currently sitting at `slotIndex` sideways by `slotsToMove`
// lane widths, in small steps so the live reflow runs the way it does for a
// real pointer rather than a single teleporting jump.
async function dragLaneBySlots(page, slotIndex, slotsToMove) {
  // Newly created lanes leave the board scrolled to the right, which can put
  // the lane being grabbed outside the viewport where mouse events cannot
  // reach it. A user would scroll it into view before dragging.
  await page.evaluate(() => { document.querySelector('.board').scrollLeft = 0 })
  await page.waitForTimeout(200)

  const pitch = await page.evaluate((selector) => {
    const lanes = [...document.querySelectorAll(selector)]
    return lanes[1].getBoundingClientRect().left - lanes[0].getBoundingClientRect().left
  }, USER_LANE_SELECTOR)

  const handle = page.locator(`${USER_LANE_SELECTOR} .lane__drag-handle`).nth(slotIndex)
  const box = await handle.boundingBox()
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  const totalX = pitch * slotsToMove

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + Math.sign(totalX) * 8, startY, { steps: 2 })
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(startX + (totalX * step) / 20, startY)
    // Let React commit the live reflow between moves, the way it does for a
    // real pointer; without this the whole drag lands in a single frame.
    await page.waitForTimeout(25)
  }
  await page.mouse.up()
}

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

  // Live reflow moves the dragged card under the cursor, after which collision
  // detection resolves `over` to the card's own node. Deriving a target lane from
  // that node's drag-start payload named the source lane and dropped the live
  // order, which the next event rebuilt: the card oscillated between both lanes
  // for as long as the pointer was held between them.
  test('a card held between two lanes settles instead of flickering between them', async ({ page }) => {
    await createLane(page, 'Source')
    await createLane(page, 'Target')

    const sourceLane = laneLocator(page, 'Source')
    const targetLane = laneLocator(page, 'Target')

    await quickAddCard(page, sourceLane, 'Held card')
    await quickAddCard(page, targetLane, 'Existing card')

    const cardBox = await page.locator('.card').filter({ hasText: 'Held card' }).boundingBox()
    const targetBox = await targetLane.boundingBox()

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 })

    // Record every distinct card ordering the DOM passes through while the
    // pointer is held still. A stable reflow produces exactly one.
    await page.evaluate(() => {
      window.__orderings = new Set()
      const read = () =>
        [...document.querySelectorAll('.lane')]
          .map((lane) => [...lane.querySelectorAll('.card')].map((card) => card.textContent).join(','))
          .join('|')
      window.__observer = new MutationObserver(() => window.__orderings.add(read()))
      window.__observer.observe(document.body, { childList: true, subtree: true })
    })

    for (let step = 0; step < 16; step += 1) {
      await page.mouse.move(targetBox.x + targetBox.width / 2 + (step % 2), targetBox.y + targetBox.height / 2)
      await page.waitForTimeout(50)
    }

    const distinctOrderings = await page.evaluate(() => {
      window.__observer.disconnect()
      return window.__orderings.size
    })
    await page.mouse.up()

    expect(distinctOrderings).toBeLessThanOrEqual(1)
    await expect(targetLane.getByText('Held card')).toBeVisible()
  })

  test('dragging a lane one slot moves it exactly one slot', async ({ page }) => {
    await createLane(page, 'First')
    await createLane(page, 'Second')
    await createLane(page, 'Third')

    await expect(userLaneNames(page)).toHaveText(['First', 'Second', 'Third'])

    // Drag "First" right by exactly one lane width. It must land in slot 2 and
    // stop there: the original bug moved a lane several slots at once, because
    // repeated onDragOver events each re-applied the same swap.
    await dragLaneBySlots(page, 0, 1)

    await expect(userLaneNames(page)).toHaveText(['Second', 'First', 'Third'])
  })

  test('a lane dragged only a few pixels does not reorder', async ({ page }) => {
    await createLane(page, 'First')
    await createLane(page, 'Second')

    await page.evaluate(() => { document.querySelector('.board').scrollLeft = 0 })
    await page.waitForTimeout(200)

    const handle = page.locator(`${USER_LANE_SELECTOR} .lane__drag-handle`).first()
    const box = await handle.boundingBox()
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 20, startY, { steps: 5 })
    await page.mouse.up()

    await expect(userLaneNames(page)).toHaveText(['First', 'Second'])
  })
})
