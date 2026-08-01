import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { usePrefersReducedMotion } = await import('./usePrefersReducedMotion')

function mockMatchMedia(initialMatches) {
  let changeHandler = null
  const mediaQueryList = {
    matches: initialMatches,
    addEventListener: vi.fn((eventName, handler) => {
      if (eventName === 'change') changeHandler = handler
    }),
    removeEventListener: vi.fn(),
  }
  window.matchMedia = vi.fn().mockReturnValue(mediaQueryList)
  return {
    triggerChange: (matches) => {
      mediaQueryList.matches = matches
      act(() => changeHandler({ matches }))
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePrefersReducedMotion', () => {
  it('returns false when the media query does not match on mount', () => {
    mockMatchMedia(false)

    const { result } = renderHook(() => usePrefersReducedMotion())

    expect(result.current).toBe(false)
  })

  it('returns true when the media query matches on mount', () => {
    mockMatchMedia(true)

    const { result } = renderHook(() => usePrefersReducedMotion())

    expect(result.current).toBe(true)
  })

  it('updates when the media query change event fires', () => {
    const { triggerChange } = mockMatchMedia(false)

    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)

    triggerChange(true)

    expect(result.current).toBe(true)
  })

  it('removes the change listener on unmount', () => {
    mockMatchMedia(false)
    const { unmount } = renderHook(() => usePrefersReducedMotion())
    const mediaQueryList = window.matchMedia.mock.results[0].value

    unmount()

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
