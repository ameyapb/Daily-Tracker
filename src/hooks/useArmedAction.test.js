import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useArmedAction } from './useArmedAction'

describe('useArmedAction', () => {
  it('starts disarmed', () => {
    const { result } = renderHook(() => useArmedAction())
    expect(result.current.isArmed).toBe(false)
  })

  it('trigger() arms on first call and returns false (not yet confirmed)', () => {
    const { result } = renderHook(() => useArmedAction())

    let confirmed
    act(() => {
      confirmed = result.current.trigger()
    })

    expect(confirmed).toBe(false)
    expect(result.current.isArmed).toBe(true)
  })

  it('trigger() confirms and disarms on second call', () => {
    const { result } = renderHook(() => useArmedAction())

    act(() => {
      result.current.trigger()
    })

    let confirmed
    act(() => {
      confirmed = result.current.trigger()
    })

    expect(confirmed).toBe(true)
    expect(result.current.isArmed).toBe(false)
  })

  it('disarm() resets to unarmed', () => {
    const { result } = renderHook(() => useArmedAction())

    act(() => {
      result.current.arm()
    })
    expect(result.current.isArmed).toBe(true)

    act(() => {
      result.current.disarm()
    })
    expect(result.current.isArmed).toBe(false)
  })
})
