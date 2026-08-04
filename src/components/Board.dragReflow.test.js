import { describe, it, expect, vi } from 'vitest'
import { computeLiveLaneOrder, computeLiveCardOrder, laneSlotAtCenter } from './Board'
import { CARD_DRAG_TYPE, LANE_DRAG_TYPE } from './dragTypes'

vi.mock('lottie-react', () => ({
  default: (props) => props,
}))

describe('computeLiveLaneOrder', () => {
  // Ids in on-screen order: the live order is resolved against what the user
  // sees, not the lanes' persisted `position` order.
  const userLanes = ['lane-a', 'lane-b', 'lane-c']

  it('reorders when the dragged lane crosses a neighbor', () => {
    const result = computeLiveLaneOrder('lane-a', 'lane-c', userLanes, null)
    expect(result).toEqual(['lane-b', 'lane-c', 'lane-a'])
  })

  it('resolves an absolute order from the persisted lanes, not by stepping previousOrder', () => {
    const previousOrder = ['lane-b', 'lane-a', 'lane-c']
    const result = computeLiveLaneOrder('lane-a', 'lane-c', userLanes, previousOrder)
    expect(result).toEqual(['lane-b', 'lane-c', 'lane-a'])
  })

  it('is idempotent when onDragOver repeats for the same target', () => {
    const first = computeLiveLaneOrder('lane-a', 'lane-b', userLanes, null)
    expect(first).toEqual(['lane-b', 'lane-a', 'lane-c'])

    // dnd-kit fires onDragOver many times while the pointer sits over one lane.
    // Re-applying it must not walk the lane further across the board.
    let repeated = first
    for (let i = 0; i < 5; i += 1) {
      repeated = computeLiveLaneOrder('lane-a', 'lane-b', userLanes, repeated)
    }
    expect(repeated).toEqual(['lane-b', 'lane-a', 'lane-c'])
    expect(repeated).toBe(first)
  })

  it('returns the base order unchanged when hovering the dragged lane itself', () => {
    const previousOrder = ['lane-b', 'lane-a', 'lane-c']
    const result = computeLiveLaneOrder('lane-a', 'lane-a', userLanes, previousOrder)
    expect(result).toBe(previousOrder)
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

describe('laneSlotAtCenter', () => {
  // Slots as measured once at drag start: three 300px lanes, 12px apart.
  const slots = [
    { laneId: 'lane-a', left: 0, right: 300, center: 150 },
    { laneId: 'lane-b', left: 312, right: 612, center: 462 },
    { laneId: 'lane-c', left: 624, right: 924, center: 774 },
  ]

  it('resolves the slot whose centre the dragged lane centre is nearest', () => {
    expect(laneSlotAtCenter(slots, 150)).toBe('lane-a')
    expect(laneSlotAtCenter(slots, 462)).toBe('lane-b')
    expect(laneSlotAtCenter(slots, 774)).toBe('lane-c')
  })

  it('resolves a centre sitting in the gap between two lanes to the nearer one', () => {
    expect(laneSlotAtCenter(slots, 306)).toBe('lane-a')
    expect(laneSlotAtCenter(slots, 320)).toBe('lane-b')
  })

  it('clamps to the end slots rather than returning nothing past the board edges', () => {
    expect(laneSlotAtCenter(slots, -900)).toBe('lane-a')
    expect(laneSlotAtCenter(slots, 9000)).toBe('lane-c')
  })

  it('returns null when no slots were measured', () => {
    expect(laneSlotAtCenter([], 100)).toBeNull()
  })
})

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

  // Once live reflow has moved the dragged card into the target lane, collision
  // detection resolves `over` to the dragged card's own node, whose data payload
  // still carries the lane_id it had at drag start. Treating that stale lane as a
  // fresh target discarded the live order and re-created it on the next event,
  // oscillating the card between both lanes for as long as the pointer was held.
  it('keeps the live order in the target lane when over resolves to the dragged card itself', () => {
    const previous = { laneId: 'lane-b', cardIds: ['card-a1', 'card-b1'] }
    const result = computeLiveCardOrder(activeFor(cardA1), overCard(cardA1), cards, lanes, previous)
    expect(result).toBe(previous)
  })

  it('returns null when over is null', () => {
    const result = computeLiveCardOrder(activeFor(cardA1), null, cards, lanes, null)
    expect(result).toBeNull()
  })
})
