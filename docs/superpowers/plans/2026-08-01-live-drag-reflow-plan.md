# Live Drag Reflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make lane reordering and card drag-and-drop reflow live during the drag (Trello/Jira-style "make way" animation) instead of only snapping into place on drop.

**Architecture:** Add `onDragOver` to `Board`'s single `DndContext`. Two new local-only state values (`liveLaneOrder`, `liveCardOrder`) hold the in-progress visual order; `Board` renders lane/card lists derived from these overrides when set, falling back to real `lanes`/`cards` otherwise. `Lane`/`Card` already animate list reordering via `motion.div layout` (`LAYOUT_REFLOW_TRANSITION`), so no changes are needed inside those components — reordering the array `Board` passes as `cards`/rendering order is sufficient to trigger the existing slide animation. `onDragEnd` commits using the live override (if present) as the final order, then clears both overrides; `onDragCancel` and any mutation failure also clear them, which is the entire rollback mechanism since the override was always visual-only.

**Tech Stack:** React, dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`), framer-motion (already in use, no new usage patterns).

## Global Constraints

- No changes to status-transition logic (`setCardStatus`, `moveCardOutOfSystemLane`), the DB schema, or `data/` layer mutators.
- No changes inside `Lane.jsx`/`Card.jsx` rendering or CSS — they already reflow via `motion.div layout` when their input array's order changes.
- System lanes never participate in lane reordering (mirrors existing `handleLaneDragEnd` scoping to `userLanes`).
- Persisted reorder (`reorderUserLanes` / `reorderCardsInLane` / `moveCardToLane` / `setCardStatus` / `moveCardOutOfSystemLane`) still fires exactly once, at drop — `onDragOver` only ever updates local visual state, never calls a mutator.
- New pure logic goes in exported, standalone functions in `Board.jsx` (matching the existing `handleLaneDragEnd`/`handleCardDragEnd`/`targetLaneIdFor` pattern) so it's unit-testable without rendering.
- No new dependencies.

---

## File Structure

- Modify: `src/components/Board.jsx` — add `computeLiveLaneOrder`, `computeLiveCardOrder` pure functions; add `liveLaneOrder`/`liveCardOrder` state; add `onDragOver` handler; wire derived render lists; update `onDragEnd`/`onDragCancel` to use and clear the override state.
- Create: `src/components/Board.dragReflow.test.js` — unit tests for the two new pure functions (no rendering, matches the plain-function-testing pattern the spec calls for).

No other files change. `Lane.jsx`, `Card.jsx`, `meadowConstants.js` need no edits — the existing `LAYOUT_REFLOW_TRANSITION`/`motion.div layout` wiring (already on `main`, see current diff) is the animation mechanism; this plan only changes *when* the array order Board passes down changes.

---

### Task 1: `computeLiveLaneOrder` pure function + unit tests

**Files:**
- Modify: `src/components/Board.jsx` (add function near top, alongside `handleLaneDragEnd`)
- Test: `src/components/Board.dragReflow.test.js` (new file)

**Interfaces:**
- Produces: `computeLiveLaneOrder(activeId, overId, userLanes, previousOrder)` → `string[]`
  - `activeId`: id of the lane being dragged (`active.id` from dnd-kit event)
  - `overId`: id of the current collision target (`over.id`), or `null`/`undefined` if not over anything
  - `userLanes`: current array of user lane objects (`{ id, ... }`), same shape as `lanes.filter(lane => !lane.is_system)`
  - `previousOrder`: `string[] | null` — the current `liveLaneOrder` state (null when a lane drag has just started and no override exists yet)
  - Returns: `string[]` of lane ids in the new live order. If `overId` doesn't resolve to a user lane in the working list, or the computed order is unchanged from `previousOrder`, returns `previousOrder` (or the identity order derived from `userLanes` if `previousOrder` was null) unchanged — this is the "no thrashing" guard from the spec.

**Step 1: Write the failing tests**

Create `src/components/Board.dragReflow.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { computeLiveLaneOrder } from './Board'

describe('computeLiveLaneOrder', () => {
  const userLanes = [
    { id: 'lane-a', name: 'A' },
    { id: 'lane-b', name: 'B' },
    { id: 'lane-c', name: 'C' },
  ]

  it('reorders when the dragged lane crosses a neighbor', () => {
    const result = computeLiveLaneOrder('lane-a', 'lane-c', userLanes, null)
    expect(result).toEqual(['lane-b', 'lane-c', 'lane-a'])
  })

  it('starts from previousOrder rather than recomputing from userLanes when already dragging', () => {
    const previousOrder = ['lane-b', 'lane-a', 'lane-c']
    const result = computeLiveLaneOrder('lane-a', 'lane-c', userLanes, previousOrder)
    expect(result).toEqual(['lane-b', 'lane-c', 'lane-a'])
  })

  it('returns the identity order unchanged when overId is not a known user lane (e.g. over a system lane)', () => {
    const result = computeLiveLaneOrder('lane-a', 'system-lane-1', userLanes, null)
    expect(result).toEqual(['lane-a', 'lane-b', 'lane-c'])
  })

  it('does not recompute (same array reference semantics not required, but same order) when the index has not changed', () => {
    const previousOrder = ['lane-a', 'lane-b', 'lane-c']
    const result = computeLiveLaneOrder('lane-a', 'lane-a', userLanes, previousOrder)
    expect(result).toEqual(previousOrder)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- Board.dragReflow`
Expected: FAIL — `computeLiveLaneOrder` is not exported from `Board.jsx` (does not exist yet).

**Step 3: Implement `computeLiveLaneOrder`**

In `src/components/Board.jsx`, add near the top (after imports, before `handleLaneDragEnd`):

```js
export function computeLiveLaneOrder(activeId, overId, userLanes, previousOrder) {
  const baseOrder = previousOrder ?? userLanes.map((lane) => lane.id)
  if (!overId) return baseOrder

  const oldIndex = baseOrder.indexOf(activeId)
  const newIndex = baseOrder.indexOf(overId)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return baseOrder

  return arrayMove(baseOrder, oldIndex, newIndex)
}
```

This reuses the already-imported `arrayMove` from `@dnd-kit/sortable`. It operates on plain id arrays (not lane objects) so `previousOrder` round-trips cleanly through repeated calls during a single drag.

**Step 4: Run tests to verify they pass**

Run: `npm run test -- Board.dragReflow`
Expected: PASS (all 4 tests).

**Step 5: Commit**

```bash
git add src/components/Board.jsx src/components/Board.dragReflow.test.js
git commit -m "feat: add computeLiveLaneOrder for live drag reflow"
```

---

### Task 2: `computeLiveCardOrder` pure function + unit tests

**Files:**
- Modify: `src/components/Board.jsx`
- Test: `src/components/Board.dragReflow.test.js`

**Interfaces:**
- Consumes: `targetLaneIdFor(over)` (already defined in `Board.jsx`, unchanged)
- Produces: `computeLiveCardOrder(active, over, cards, lanes, previousLiveCardOrder)` → `{ laneId: string, cardIds: string[] } | null`
  - `active`: dnd-kit `active` object (`{ id, data: { current: { type, card } } }`)
  - `over`: dnd-kit `over` object (`{ id, data: { current: { type, card? } } }`) or `null`
  - `cards`: current full `cards` array (real data, not a previous override)
  - `lanes`: current full `lanes` array
  - `previousLiveCardOrder`: the current `liveCardOrder` state (`{ laneId, cardIds } | null`)
  - Returns `null` when there's nothing to preview live (no `over`, target is a system lane about to trigger a status transition rather than a reorder/move, or the target lane can't be resolved).
  - Returns `{ laneId, cardIds }` describing the live order of the lane currently under the cursor, with the dragged card's id present in exactly that lane's `cardIds` (and implicitly absent from every other lane's rendering, via the `null` fallback + `laneId` match in `Board`'s render derivation from Task 3).

**Step 1: Write the failing tests**

Append to `src/components/Board.dragReflow.test.js`:

```js
import { computeLiveCardOrder } from './Board'
import { CARD_DRAG_TYPE, LANE_DRAG_TYPE } from './dragTypes'

describe('computeLiveCardOrder', () => {
  const userLaneA = { id: 'lane-a', is_system: false }
  const userLaneB = { id: 'lane-b', is_system: false }
  const systemLane = { id: 'lane-delayed', is_system: true, system_type: 'delayed' }
  const lanes = [userLaneA, userLaneB, systemLane]

  const cardA1 = { id: 'card-a1', lane_id: 'lane-a', status: 'TODO' }
  const cardA2 = { id: 'card-a2', lane_id: 'lane-a', status: 'TODO' }
  const cardB1 = { id: 'card-b1', lane_id: 'lane-b', status: 'TODO' }
  const cards = [cardA1, cardA2, cardB1]

  function activeFor(card) {
    return { id: card.id, data: { current: { type: CARD_DRAG_TYPE, card } } }
  }

  function overCard(card) {
    return { id: card.id, data: { current: { type: CARD_DRAG_TYPE, card } } }
  }

  function overLane(lane) {
    return { id: lane.id, data: { current: { type: LANE_DRAG_TYPE, lane } } }
  }

  it('reorders within the same lane when crossing a sibling card', () => {
    const result = computeLiveCardOrder(activeFor(cardA1), overCard(cardA2), cards, lanes, null)
    expect(result).toEqual({ laneId: 'lane-a', cardIds: ['card-a2', 'card-a1'] })
  })

  it('moves the dragged card into the target lane when crossing into a different user lane (dropped on a card)', () => {
    const result = computeLiveCardOrder(activeFor(cardA1), overCard(cardB1), cards, lanes, null)
    expect(result).toEqual({ laneId: 'lane-b', cardIds: ['card-a1', 'card-b1'] })
  })

  it('moves the dragged card into an empty/target lane when hovering the lane body directly', () => {
    const emptyLaneCards = [cardA1]
    const result = computeLiveCardOrder(
      activeFor(cardA1),
      overLane(userLaneB),
      emptyLaneCards,
      lanes,
      null,
    )
    expect(result).toEqual({ laneId: 'lane-b', cardIds: ['card-a1'] })
  })

  it('returns null when hovering a system lane the card is not already in (status transition territory, not a reorder)', () => {
    const result = computeLiveCardOrder(activeFor(cardA1), overLane(systemLane), cards, lanes, null)
    expect(result).toBeNull()
  })

  it('returns previousLiveCardOrder unchanged when the resolved order has not changed', () => {
    const previous = { laneId: 'lane-a', cardIds: ['card-a1', 'card-a2'] }
    const result = computeLiveCardOrder(activeFor(cardA1), overCard(cardA1), cards, lanes, previous)
    expect(result).toBe(previous)
  })

  it('returns null when over is null', () => {
    const result = computeLiveCardOrder(activeFor(cardA1), null, cards, lanes, null)
    expect(result).toBeNull()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- Board.dragReflow`
Expected: FAIL — `computeLiveCardOrder` is not exported yet.

**Step 3: Implement `computeLiveCardOrder`**

In `src/components/Board.jsx`, add after `targetLaneIdFor` (which it reuses) and before `handleCardDragEnd`:

```js
export function computeLiveCardOrder(active, over, cards, lanes, previousLiveCardOrder) {
  if (!over) return null

  const draggedCard = active.data.current.card
  const targetLaneId = targetLaneIdFor(over)
  if (!targetLaneId) return null

  const targetLane = lanes.find((lane) => lane.id === targetLaneId)
  if (!targetLane) return null

  const isEnteringSystemLaneAsStatusChange =
    targetLane.is_system && draggedCard.lane_id !== targetLaneId
  if (isEnteringSystemLaneAsStatusChange) return null

  const cardsInTargetLane = cards.filter(
    (card) => card.lane_id === targetLaneId && card.id !== draggedCard.id,
  )

  let cardIds
  if (over.data.current?.type === CARD_DRAG_TYPE && over.id !== draggedCard.id) {
    const overIndex = cardsInTargetLane.findIndex((card) => card.id === over.id)
    const insertAt = overIndex === -1 ? cardsInTargetLane.length : overIndex
    cardIds = [
      ...cardsInTargetLane.slice(0, insertAt).map((card) => card.id),
      draggedCard.id,
      ...cardsInTargetLane.slice(insertAt).map((card) => card.id),
    ]
  } else {
    cardIds = [...cardsInTargetLane.map((card) => card.id), draggedCard.id]
  }

  if (
    previousLiveCardOrder?.laneId === targetLaneId &&
    previousLiveCardOrder.cardIds.length === cardIds.length &&
    previousLiveCardOrder.cardIds.every((id, index) => id === cardIds[index])
  ) {
    return previousLiveCardOrder
  }

  return { laneId: targetLaneId, cardIds }
}
```

Note: system-lane-to-system-lane (DELAYED directly onto COMPLETED) is also excluded from live reorder by the `targetLane.is_system && draggedCard.lane_id !== targetLaneId` guard, since that's a status transition too, matching `handleCardDragEnd`'s existing treatment of it.

**Step 4: Run tests to verify they pass**

Run: `npm run test -- Board.dragReflow`
Expected: PASS (all 11 tests across both describe blocks).

**Step 5: Commit**

```bash
git add src/components/Board.jsx src/components/Board.dragReflow.test.js
git commit -m "feat: add computeLiveCardOrder for live drag reflow"
```

---

### Task 3: Wire `liveLaneOrder`/`liveCardOrder` state, `onDragOver`, and derived render lists into `Board`

**Files:**
- Modify: `src/components/Board.jsx`

**Interfaces:**
- Consumes: `computeLiveLaneOrder` (Task 1), `computeLiveCardOrder` (Task 2), existing `handleLaneDragEnd`/`handleCardDragEnd`/`targetLaneIdFor`.
- Produces: `Board` renders `userLanes`/`cardsByLaneId(laneId)` from live overrides when present; `onDragEnd` consumes the same overrides as the final order before calling existing mutators.

**Step 1: Add state**

In `Board`, alongside the existing `activeDragCard`/`activeDragLane` state (around line 118-120):

```js
  const [liveLaneOrder, setLiveLaneOrder] = useState(null)
  const [liveCardOrder, setLiveCardOrder] = useState(null)
```

**Step 2: Add `onDragOver` handler**

Add after `handleDragStart` (around line 160):

```js
  function handleDragOver(event) {
    const { active, over } = event

    if (active.data.current?.type === LANE_DRAG_TYPE) {
      const userLaneIds = lanes.filter((lane) => !lane.is_system).map((lane) => lane.id)
      const baseUserLanes = lanes.filter((lane) => !lane.is_system)
      setLiveLaneOrder((currentOrder) =>
        computeLiveLaneOrder(active.id, over?.id ?? null, baseUserLanes, currentOrder),
      )
      return
    }

    if (active.data.current?.type === CARD_DRAG_TYPE) {
      setLiveCardOrder((currentOrder) => computeLiveCardOrder(active, over, cards, lanes, currentOrder))
    }
  }
```

(`userLaneIds` above is unused by `computeLiveLaneOrder` directly, which takes lane objects, not ids, remove that intermediate line: `computeLiveLaneOrder` was defined in Task 1 to accept `userLanes` objects, matching `userLanes.map((lane) => lane.id)` fallback inside it. Delete the stray `userLaneIds` line so the implementation is exactly:)

```js
  function handleDragOver(event) {
    const { active, over } = event

    if (active.data.current?.type === LANE_DRAG_TYPE) {
      const baseUserLanes = lanes.filter((lane) => !lane.is_system)
      setLiveLaneOrder((currentOrder) =>
        computeLiveLaneOrder(active.id, over?.id ?? null, baseUserLanes, currentOrder),
      )
      return
    }

    if (active.data.current?.type === CARD_DRAG_TYPE) {
      setLiveCardOrder((currentOrder) => computeLiveCardOrder(active, over, cards, lanes, currentOrder))
    }
  }
```

**Step 3: Wire `onDragOver` into `DndContext`**

Around line 277-283, add the prop:

```jsx
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
```

**Step 4: Clear overrides in `handleDragEnd` and `handleDragCancel`, and use overrides as final order**

Replace `handleDragEnd` (current lines 169-197) with:

```js
  function handleDragEnd(event) {
    const { active, over } = event
    setActiveDragCard(null)
    setActiveDragLane(null)
    const finalLiveLaneOrder = liveLaneOrder
    const finalLiveCardOrder = liveCardOrder
    setLiveLaneOrder(null)
    setLiveCardOrder(null)

    if (active.data.current?.type === CARD_DRAG_TYPE) {
      flagCardAsJustDropped(active.id)
    }

    if (!over || active.id === over.id) return

    if (active.data.current?.type === LANE_DRAG_TYPE) {
      if (finalLiveLaneOrder) {
        reorderUserLanes(finalLiveLaneOrder)
      } else {
        handleLaneDragEnd(active, over, lanes, reorderUserLanes)
      }
      return
    }

    if (active.data.current?.type === CARD_DRAG_TYPE) {
      handleCardDragEnd(
        active,
        over,
        cards,
        lanes,
        moveCardToLane,
        setCardStatus,
        moveCardOutOfSystemLane,
        reorderCardsInLane,
        finalLiveCardOrder,
      )
    }
  }
```

And `handleDragCancel` (current lines 199-202):

```js
  function handleDragCancel() {
    setActiveDragCard(null)
    setActiveDragLane(null)
    setLiveLaneOrder(null)
    setLiveCardOrder(null)
  }
```

**Step 5: Extend `handleCardDragEnd` to consume the live card order**

`handleCardDragEnd` (top-level function, lines 43-81) currently recomputes the within-lane reorder itself via `arrayMove` on `oldIndex`/`newIndex`. Since `finalLiveCardOrder` already reflects every crossing made during the drag (per the spec's flow), prefer it when present and matching the same-lane reorder case. Replace the function body's final block (lines 72-81) with:

```js
  if (over.data.current?.type !== CARD_DRAG_TYPE) return

  if (liveCardOrder && liveCardOrder.laneId === targetLaneId) {
    reorderCardsInLane(targetLaneId, liveCardOrder.cardIds)
    return
  }

  const cardsInLane = cards.filter((card) => card.lane_id === targetLaneId)
  const oldIndex = cardsInLane.findIndex((card) => card.id === active.id)
  const newIndex = cardsInLane.findIndex((card) => card.id === over.id)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

  const reordered = arrayMove(cardsInLane, oldIndex, newIndex)
  reorderCardsInLane(targetLaneId, reordered.map((card) => card.id))
```

And update the function signature (line 43-52) to accept the new parameter:

```js
function handleCardDragEnd(
  active,
  over,
  cards,
  lanes,
  moveCardToLane,
  setCardStatus,
  moveCardOutOfSystemLane,
  reorderCardsInLane,
  liveCardOrder,
) {
```

The cross-lane branch (lines 57-70, `draggedCard.lane_id !== targetLaneId`) is unchanged — moving across lanes already goes through `moveCardToLane`/`setCardStatus`/`moveCardOutOfSystemLane`, none of which take an explicit card order, so the live-order value only matters for the same-lane reorder path.

**Step 6: Derive render lists from live overrides**

Replace the `userLanes`/`systemLanes`/`cardsByLaneId` definitions (current lines 255-257):

```js
  const realUserLanes = lanes.filter((lane) => !lane.is_system)
  const userLanes = liveLaneOrder
    ? liveLaneOrder
        .map((laneId) => realUserLanes.find((lane) => lane.id === laneId))
        .filter(Boolean)
    : realUserLanes
  const systemLanes = lanes.filter((lane) => lane.is_system)

  function cardsByLaneId(laneId) {
    const realCardsInLane = cards.filter((card) => card.lane_id === laneId)

    if (!liveCardOrder) return realCardsInLane

    if (liveCardOrder.laneId === laneId) {
      const cardsById = new Map(cards.map((card) => [card.id, card]))
      return liveCardOrder.cardIds.map((cardId) => cardsById.get(cardId)).filter(Boolean)
    }

    const draggedCardId = activeDragCard?.id
    if (draggedCardId) {
      return realCardsInLane.filter((card) => card.id !== draggedCardId)
    }

    return realCardsInLane
  }
```

This makes `cardsByLaneId` a function declaration instead of the current arrow-function const, which is fine since it's only called within the same render (no dependency-array/identity concerns — it's not passed to a memoized child or used in a `useEffect` dependency list).

**Step 7: Manually verify with the dev server**

Run: `npm run dev` (background), then open the app in a browser and drag a lane sideways across a neighbor, and drag a card both within a lane and across two user lanes. Confirm:
- Neighbors visibly slide out of the way during the drag (not just snapping on drop).
- Dropping still lands the card/lane in the expected final position (matches what dropping there would have done before this change).
- Dragging a card onto a system lane (DELAYED/COMPLETED) still triggers the status transition with no live reorder glitch.
- Canceling a drag (Escape key, per dnd-kit's default `KeyboardSensor` cancel) reverts to the original order with no leftover visual artifact.

**Step 8: Run the full test suite**

Run: `npm run test`
Expected: All existing tests plus the new `Board.dragReflow.test.js` pass (verifies `Board.test.jsx`'s existing render test and the E2E-adjacent unit coverage aren't broken by the `cardsByLaneId` signature change from const-arrow to function-declaration, and by the `handleCardDragEnd` signature change).

**Step 9: Commit**

```bash
git add src/components/Board.jsx
git commit -m "feat: live-reflow lanes and cards during drag via onDragOver"
```

---

### Task 4: Re-run Playwright E2E drag-and-drop specs

**Files:** none changed — verification only.

**Step 1: Run the E2E suite**

Run: `npm run test:e2e`
Expected: All existing drag-and-drop specs pass unchanged, since `onDragEnd`'s final commit contract (which mutator gets called, with what final order) is unchanged by this plan — only the visual state during the drag changed. Per the design spec, this confirms live reflow doesn't break final drop positions.

If any spec fails, do not weaken it to pass — investigate whether `computeLiveLaneOrder`/`computeLiveCardOrder`/the `onDragEnd` override-consumption logic diverges from `handleLaneDragEnd`/`handleCardDragEnd`'s original behavior for that scenario, and fix Task 3's wiring.

**Step 2: Update CLAUDE.md**

Per this repo's CLAUDE.md instruction ("Keep this file updated in the same change whenever architecture, conventions, or workflow steps change in later phases"), add a sentence to the `Board` bullet in the UI layer section describing the new `onDragOver`-driven live reflow, `liveLaneOrder`/`liveCardOrder` state, and the `computeLiveLaneOrder`/`computeLiveCardOrder` pure helpers, following the file's existing dense documentation style for `Board`'s drag-and-drop behavior.

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document live drag reflow in CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** `onDragOver` wiring (Task 3 Steps 2-3), `liveLaneOrder`/`liveCardOrder` state (Task 3 Step 1), reuse of `arrayMove` in `computeLiveLaneOrder` (Task 1), no-thrashing same-index guard (Task 1 Step 3's `oldIndex === newIndex` check, tested in Task 1's 4th test), system-lane-as-status-transition exclusion (Task 2 Step 3's `isEnteringSystemLaneAsStatusChange` guard, tested), empty-target-lane case (Task 2's 3rd test, no special-case code needed since an empty `cardsInTargetLane` just yields `[draggedCard.id]`), cross-lane source-gap-closes-target-gap-opens (Task 3 Step 6's `cardsByLaneId`, filtering the dragged card out of its stale source lane via `activeDragCard`), rollback via cancel/failure (Task 3 Steps 4 clears state in both `handleDragEnd` — always, regardless of mutator success, since state is captured into local `finalLiveLaneOrder`/`finalLiveCardOrder` before firing the (fire-and-forget from `onDragEnd`'s perspective, error-handled inside the hook via `runMutation`) mutator call — and `handleDragCancel`). Unit test coverage in Board.dragReflow.test.js matches the spec's named scenarios (crossing a neighbor mid-lane-list, crossing into a system lane, crossing between two user lanes for cards, dropping into an empty lane, boundary/no-thrashing guard).
- **Placeholder scan:** none found; every step has concrete code.
- **Type consistency:** `computeLiveLaneOrder(activeId, overId, userLanes, previousOrder)` and `computeLiveCardOrder(active, over, cards, lanes, previousLiveCardOrder)` signatures are used identically in their Task 1/2 test files and their Task 3 call sites. `liveCardOrder` shape `{ laneId, cardIds }` is consistent across Task 2's return value, Task 3 Step 5's `handleCardDragEnd` consumption, and Task 3 Step 6's `cardsByLaneId` consumption.
