import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

vi.mock('../data/lanes', () => ({
  fetchLanes: vi.fn(),
  createLane: vi.fn(),
  renameLane: vi.fn(),
  reorderLane: vi.fn(),
  deleteLane: vi.fn(),
}))

const {
  fetchLanes,
  createLane: createLaneRequest,
  renameLane: renameLaneRequest,
  reorderLane: reorderLaneRequest,
  deleteLane: deleteLaneRequest,
} = await import('../data/lanes')
const { useLanes } = await import('./useLanes')

const DELAYED_LANE = { id: 'sys-delayed', name: 'DELAYED', position: -2, is_system: true, system_type: 'delayed' }
const COMPLETED_LANE = { id: 'sys-completed', name: 'COMPLETED', position: -1, is_system: true, system_type: 'completed' }
const WORK_LANE = { id: 'lane-1', name: 'Work', position: 0, is_system: false, system_type: null }
const HOME_LANE = { id: 'lane-2', name: 'Home', position: 1, is_system: false, system_type: null }

beforeEach(() => {
  fetchLanes.mockReset()
  createLaneRequest.mockReset()
  renameLaneRequest.mockReset()
  reorderLaneRequest.mockReset()
  deleteLaneRequest.mockReset()
})

async function renderLoadedLanes(lanes) {
  fetchLanes.mockResolvedValue(lanes)
  const hook = renderHook(() => useLanes())
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
  return hook
}

describe('useLanes', () => {
  it('loads lanes on mount', async () => {
    const { result } = await renderLoadedLanes([DELAYED_LANE, COMPLETED_LANE, WORK_LANE])

    expect(result.current.lanes).toEqual([DELAYED_LANE, COMPLETED_LANE, WORK_LANE])
    expect(result.current.error).toBeNull()
  })

  it('captures an error when loading fails', async () => {
    const error = new Error('load failed')
    fetchLanes.mockRejectedValue(error)

    const { result } = renderHook(() => useLanes())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe(error)
  })

  it('creates a lane positioned after the last user lane', async () => {
    const { result } = await renderLoadedLanes([DELAYED_LANE, COMPLETED_LANE, WORK_LANE])
    const created = { id: 'lane-2', name: 'Home', position: 1, is_system: false, system_type: null }
    createLaneRequest.mockResolvedValue(created)

    await act(async () => {
      await result.current.createLane('Home')
    })

    expect(createLaneRequest).toHaveBeenCalledWith({ name: 'Home', position: 1 })
    expect(result.current.lanes).toContainEqual(created)
  })

  it('creates the first user lane at position 0 when only system lanes exist', async () => {
    const { result } = await renderLoadedLanes([DELAYED_LANE, COMPLETED_LANE])
    createLaneRequest.mockResolvedValue(WORK_LANE)

    await act(async () => {
      await result.current.createLane('Work')
    })

    expect(createLaneRequest).toHaveBeenCalledWith({ name: 'Work', position: 0 })
  })

  it('renames a lane and updates local state', async () => {
    const { result } = await renderLoadedLanes([WORK_LANE])
    const renamed = { ...WORK_LANE, name: 'Deep Work' }
    renameLaneRequest.mockResolvedValue(renamed)

    await act(async () => {
      await result.current.renameLane('lane-1', 'Deep Work')
    })

    expect(renameLaneRequest).toHaveBeenCalledWith('lane-1', 'Deep Work')
    expect(result.current.lanes).toEqual([renamed])
  })

  it('deletes a lane and removes it from local state', async () => {
    const { result } = await renderLoadedLanes([WORK_LANE, HOME_LANE])
    deleteLaneRequest.mockResolvedValue(undefined)

    await act(async () => {
      await result.current.deleteLane('lane-1')
    })

    expect(deleteLaneRequest).toHaveBeenCalledWith('lane-1')
    expect(result.current.lanes).toEqual([HOME_LANE])
  })

  it('reorders user lanes and persists only lanes whose position changed', async () => {
    const { result } = await renderLoadedLanes([DELAYED_LANE, COMPLETED_LANE, WORK_LANE, HOME_LANE])
    reorderLaneRequest.mockResolvedValue({})

    await act(async () => {
      await result.current.reorderUserLanes(['lane-2', 'lane-1'])
    })

    expect(reorderLaneRequest).toHaveBeenCalledTimes(2)
    expect(reorderLaneRequest).toHaveBeenCalledWith('lane-2', 0)
    expect(reorderLaneRequest).toHaveBeenCalledWith('lane-1', 1)

    const userLanes = result.current.lanes.filter((lane) => !lane.is_system)
    expect(userLanes.map((lane) => lane.id)).toEqual(['lane-2', 'lane-1'])
  })

  it('does not persist a lane whose position is unchanged by reordering', async () => {
    const { result } = await renderLoadedLanes([WORK_LANE, HOME_LANE])
    reorderLaneRequest.mockResolvedValue({})

    await act(async () => {
      await result.current.reorderUserLanes(['lane-1', 'lane-2'])
    })

    expect(reorderLaneRequest).not.toHaveBeenCalled()
  })

  it('captures a mutation error when creating a lane fails, without touching local state', async () => {
    const { result } = await renderLoadedLanes([WORK_LANE])
    const error = new Error('create failed')
    createLaneRequest.mockRejectedValue(error)

    await act(async () => {
      await expect(result.current.createLane('Home')).rejects.toThrow(error)
    })

    expect(result.current.mutationError).toBe(error)
    expect(result.current.lanes).toEqual([WORK_LANE])
  })

  it('clears a mutation error via clearMutationError', async () => {
    const { result } = await renderLoadedLanes([WORK_LANE])
    createLaneRequest.mockRejectedValue(new Error('create failed'))

    await act(async () => {
      await result.current.createLane('Home').catch(() => {})
    })
    expect(result.current.mutationError).not.toBeNull()

    act(() => {
      result.current.clearMutationError()
    })
    expect(result.current.mutationError).toBeNull()
  })
})
