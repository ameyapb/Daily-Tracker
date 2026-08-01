import { describe, it, expect, vi } from 'vitest'
import { computeLiveLaneOrder } from './Board'

vi.mock('lottie-react', () => ({
  default: (props) => props,
}))

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
