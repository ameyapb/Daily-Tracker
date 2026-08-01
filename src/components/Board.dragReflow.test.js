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
