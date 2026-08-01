import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { RABBIT_IDLE_BEHAVIOR_INTERVAL_MS, BABY_RABBIT_ANIMATION_DURATION_MS } from '../components/meadowConstants'

const { useBushIdleEvent } = await import('./useBushIdleEvent')

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useBushIdleEvent', () => {
  it('starts idle (not playing) immediately after mount', () => {
    vi.useFakeTimers()

    const { result, unmount } = renderHook(() => useBushIdleEvent(true))

    expect(result.current).toBe(false)
    unmount()
  })

  it('starts playing once the scheduled interval elapses', () => {
    vi.useFakeTimers()

    const { result, unmount } = renderHook(() => useBushIdleEvent(true))

    act(() => {
      vi.advanceTimersByTime(RABBIT_IDLE_BEHAVIOR_INTERVAL_MS.MAX + 1)
    })

    expect(result.current).toBe(true)
    unmount()
  })

  it('stops playing after the animation duration and reschedules', () => {
    vi.useFakeTimers()

    const { result, unmount } = renderHook(() => useBushIdleEvent(true))

    act(() => {
      vi.advanceTimersByTime(RABBIT_IDLE_BEHAVIOR_INTERVAL_MS.MAX + 1)
    })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(BABY_RABBIT_ANIMATION_DURATION_MS)
    })
    expect(result.current).toBe(false)
    unmount()
  })

  it('never plays when disabled', () => {
    vi.useFakeTimers()

    const { result, unmount } = renderHook(() => useBushIdleEvent(false))

    act(() => {
      vi.advanceTimersByTime(RABBIT_IDLE_BEHAVIOR_INTERVAL_MS.MAX + BABY_RABBIT_ANIMATION_DURATION_MS)
    })

    expect(result.current).toBe(false)
    unmount()
  })

  it('stops future firing once disabled mid-flight', () => {
    vi.useFakeTimers()

    const { result, rerender, unmount } = renderHook(({ enabled }) => useBushIdleEvent(enabled), {
      initialProps: { enabled: true },
    })

    rerender({ enabled: false })

    act(() => {
      vi.advanceTimersByTime(RABBIT_IDLE_BEHAVIOR_INTERVAL_MS.MAX + BABY_RABBIT_ANIMATION_DURATION_MS)
    })

    expect(result.current).toBe(false)
    unmount()
  })
})
