import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CARD_STATUS } from '../data/constants'
import { RABBIT_IN_A_HAT_ANIMATION_DURATION_MS } from '../components/meadowConstants'

const { useCompletionCelebration } = await import('./useCompletionCelebration')

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useCompletionCelebration', () => {
  it('does not play on initial mount even if already completed', () => {
    const { result, unmount } = renderHook(() => useCompletionCelebration(CARD_STATUS.COMPLETED, true))

    expect(result.current).toBe(false)
    unmount()
  })

  it('plays once when status transitions into COMPLETED', () => {
    const { result, rerender, unmount } = renderHook(
      ({ status }) => useCompletionCelebration(status, true),
      { initialProps: { status: CARD_STATUS.IN_PROGRESS } },
    )

    expect(result.current).toBe(false)

    rerender({ status: CARD_STATUS.COMPLETED })

    expect(result.current).toBe(true)
    unmount()
  })

  it('stops playing after the animation duration elapses', () => {
    vi.useFakeTimers()

    const { result, rerender, unmount } = renderHook(
      ({ status }) => useCompletionCelebration(status, true),
      { initialProps: { status: CARD_STATUS.IN_PROGRESS } },
    )

    rerender({ status: CARD_STATUS.COMPLETED })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(RABBIT_IN_A_HAT_ANIMATION_DURATION_MS)
    })

    expect(result.current).toBe(false)
    unmount()
  })

  it('does not re-play on subsequent renders while already COMPLETED', () => {
    const { result, rerender, unmount } = renderHook(
      ({ status }) => useCompletionCelebration(status, true),
      { initialProps: { status: CARD_STATUS.IN_PROGRESS } },
    )

    rerender({ status: CARD_STATUS.COMPLETED })
    expect(result.current).toBe(true)

    rerender({ status: CARD_STATUS.COMPLETED })
    expect(result.current).toBe(true)
    unmount()
  })

  it('never plays when disabled', () => {
    const { result, rerender, unmount } = renderHook(
      ({ status, enabled }) => useCompletionCelebration(status, enabled),
      { initialProps: { status: CARD_STATUS.IN_PROGRESS, enabled: false } },
    )

    rerender({ status: CARD_STATUS.COMPLETED, enabled: false })

    expect(result.current).toBe(false)
    unmount()
  })

  it('does not play when transitioning to a non-completed status', () => {
    const { result, rerender, unmount } = renderHook(
      ({ status }) => useCompletionCelebration(status, true),
      { initialProps: { status: CARD_STATUS.TODO } },
    )

    rerender({ status: CARD_STATUS.IN_PROGRESS })

    expect(result.current).toBe(false)
    unmount()
  })
})
