import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePolling } from './usePolling'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePolling', () => {
  it('calls the callback immediately on mount', () => {
    const callback = vi.fn()
    renderHook(() => usePolling(callback, 1000))

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('calls the callback again on each interval tick', () => {
    const callback = vi.fn()
    renderHook(() => usePolling(callback, 1000))

    vi.advanceTimersByTime(3000)

    expect(callback).toHaveBeenCalledTimes(4)
  })

  it('stops polling after unmount', () => {
    const callback = vi.fn()
    const { unmount } = renderHook(() => usePolling(callback, 1000))

    unmount()
    callback.mockClear()
    vi.advanceTimersByTime(5000)

    expect(callback).not.toHaveBeenCalled()
  })
})
