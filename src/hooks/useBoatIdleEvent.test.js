import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BOAT_IDLE_INTERVAL_MS, BOAT_DRIFT_DURATION_MS } from '../components/meadowConstants'

const { useBoatIdleEvent } = await import('./useBoatIdleEvent')

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(1)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useBoatIdleEvent', () => {
  it('starts idle (not playing) immediately after mount', () => {
    vi.useFakeTimers()

    const { result, unmount } = renderHook(() => useBoatIdleEvent(true))

    expect(result.current).toBe(false)
    unmount()
  })

  it('starts playing once the scheduled interval elapses', () => {
    vi.useFakeTimers()

    const { result, unmount } = renderHook(() => useBoatIdleEvent(true))

    act(() => {
      vi.advanceTimersByTime(BOAT_IDLE_INTERVAL_MS.MAX + 1)
    })

    expect(result.current).toBe(true)
    unmount()
  })

  it('stops playing after the drift duration and reschedules', () => {
    vi.useFakeTimers()

    const { result, unmount } = renderHook(() => useBoatIdleEvent(true))

    act(() => {
      vi.advanceTimersByTime(BOAT_IDLE_INTERVAL_MS.MAX + 1)
    })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(BOAT_DRIFT_DURATION_MS)
    })
    expect(result.current).toBe(false)
    unmount()
  })

  it('never plays when disabled', () => {
    vi.useFakeTimers()

    const { result, unmount } = renderHook(() => useBoatIdleEvent(false))

    act(() => {
      vi.advanceTimersByTime(BOAT_IDLE_INTERVAL_MS.MAX + BOAT_DRIFT_DURATION_MS)
    })

    expect(result.current).toBe(false)
    unmount()
  })

  it('stops future firing once disabled mid-flight', () => {
    vi.useFakeTimers()

    const { result, rerender, unmount } = renderHook(({ enabled }) => useBoatIdleEvent(enabled), {
      initialProps: { enabled: true },
    })

    rerender({ enabled: false })

    act(() => {
      vi.advanceTimersByTime(BOAT_IDLE_INTERVAL_MS.MAX + BOAT_DRIFT_DURATION_MS)
    })

    expect(result.current).toBe(false)
    unmount()
  })
})
