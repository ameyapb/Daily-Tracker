import { describe, it, expect, vi, afterEach } from 'vitest'
import { randomInRange, randomTiming } from './meadowUtils'

describe('randomInRange', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns min when Math.random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(randomInRange(10, 20)).toBe(10)
  })

  it('scales between min and max using Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(randomInRange(10, 20)).toBe(15)
  })
})

describe('randomTiming', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds a durationMs/delayMs pair from the given ranges', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(randomTiming({ MIN: 100, MAX: 200 }, { MIN: 0, MAX: 50 })).toEqual({
      durationMs: 100,
      delayMs: 0,
    })
  })
})
