import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMutationError } from './useMutationError'

describe('useMutationError', () => {
  it('starts with no mutation error', () => {
    const { result } = renderHook(() => useMutationError())
    expect(result.current.mutationError).toBeNull()
  })

  it('returns the mutation function result when it succeeds', async () => {
    const { result } = renderHook(() => useMutationError())

    let returned
    await act(async () => {
      returned = await result.current.runMutation(async () => 'ok')
    })

    expect(returned).toBe('ok')
    expect(result.current.mutationError).toBeNull()
  })

  it('captures and rethrows an error from a failing mutation', async () => {
    const { result } = renderHook(() => useMutationError())
    const error = new Error('mutation failed')

    await act(async () => {
      await expect(
        result.current.runMutation(async () => {
          throw error
        }),
      ).rejects.toThrow(error)
    })

    expect(result.current.mutationError).toBe(error)
  })

  it('clears a previous error on the next successful mutation', async () => {
    const { result } = renderHook(() => useMutationError())
    const error = new Error('mutation failed')

    await act(async () => {
      await result.current
        .runMutation(async () => {
          throw error
        })
        .catch(() => {})
    })
    expect(result.current.mutationError).toBe(error)

    await act(async () => {
      await result.current.runMutation(async () => 'ok')
    })
    expect(result.current.mutationError).toBeNull()
  })

  it('clears the error via clearMutationError', async () => {
    const { result } = renderHook(() => useMutationError())
    const error = new Error('mutation failed')

    await act(async () => {
      await result.current
        .runMutation(async () => {
          throw error
        })
        .catch(() => {})
    })
    expect(result.current.mutationError).toBe(error)

    act(() => {
      result.current.clearMutationError()
    })
    expect(result.current.mutationError).toBeNull()
  })
})
