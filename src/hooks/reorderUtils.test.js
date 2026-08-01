import { describe, it, expect } from 'vitest'
import { nextPosition, reorderAndDiff } from './reorderUtils'

describe('nextPosition', () => {
  it('returns the starting position when the list is empty', () => {
    expect(nextPosition([], 0)).toBe(0)
  })

  it('returns one past the highest existing position', () => {
    expect(nextPosition([{ position: 0 }, { position: 2 }], 0)).toBe(3)
  })
})

describe('reorderAndDiff', () => {
  const ITEM_A = { id: 'a', position: 0 }
  const ITEM_B = { id: 'b', position: 1 }
  const ITEM_C = { id: 'c', position: 2 }

  it('reassigns positions to match the given order', () => {
    const { reordered } = reorderAndDiff([ITEM_A, ITEM_B, ITEM_C], ['c', 'a', 'b'])

    expect(reordered).toEqual([
      { id: 'c', position: 0 },
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
    ])
  })

  it('only includes items whose position actually changed in changed', () => {
    const { changed } = reorderAndDiff([ITEM_A, ITEM_B, ITEM_C], ['a', 'c', 'b'])

    expect(changed.map((item) => item.id)).toEqual(['c', 'b'])
  })

  it('returns no changed items when the order is unchanged', () => {
    const { changed } = reorderAndDiff([ITEM_A, ITEM_B, ITEM_C], ['a', 'b', 'c'])

    expect(changed).toEqual([])
  })
})
