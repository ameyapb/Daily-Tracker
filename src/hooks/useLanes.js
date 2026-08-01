import { useCallback, useEffect, useState } from 'react'
import {
  fetchLanes,
  createLane as createLaneRequest,
  renameLane as renameLaneRequest,
  reorderLane as reorderLaneRequest,
  deleteLane as deleteLaneRequest,
} from '../data/lanes'
import { useMutationError } from './useMutationError'

const USER_LANE_STARTING_POSITION = 0

function nextUserLanePosition(lanes) {
  const userLanePositions = lanes.filter((lane) => !lane.is_system).map((lane) => lane.position)
  if (userLanePositions.length === 0) return USER_LANE_STARTING_POSITION
  return Math.max(...userLanePositions) + 1
}

export function useLanes() {
  const [lanes, setLanes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { mutationError, clearMutationError, runMutation } = useMutationError()

  const loadLanes = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchLanes()
      setLanes(data)
      setError(null)
    } catch (loadError) {
      setError(loadError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLanes()
  }, [loadLanes])

  const createLane = useCallback(
    async (name) => {
      await runMutation(async () => {
        const created = await createLaneRequest({ name, position: nextUserLanePosition(lanes) })
        setLanes((currentLanes) => [...currentLanes, created])
      })
    },
    [lanes, runMutation],
  )

  const renameLane = useCallback(
    async (laneId, name) => {
      await runMutation(async () => {
        const updated = await renameLaneRequest(laneId, name)
        setLanes((currentLanes) => currentLanes.map((lane) => (lane.id === laneId ? updated : lane)))
      })
    },
    [runMutation],
  )

  const deleteLane = useCallback(
    async (laneId) => {
      await runMutation(async () => {
        await deleteLaneRequest(laneId)
        setLanes((currentLanes) => currentLanes.filter((lane) => lane.id !== laneId))
      })
    },
    [runMutation],
  )

  const reorderUserLanes = useCallback(
    async (orderedUserLaneIds) => {
      const systemLanes = lanes.filter((lane) => lane.is_system)
      const laneById = new Map(lanes.map((lane) => [lane.id, lane]))

      const reorderedUserLanes = orderedUserLaneIds.map((laneId, index) => ({
        ...laneById.get(laneId),
        position: index,
      }))

      const changedLanes = reorderedUserLanes.filter(
        (lane) => laneById.get(lane.id).position !== lane.position,
      )

      setLanes(
        [...systemLanes, ...reorderedUserLanes].sort((a, b) => a.position - b.position),
      )

      await runMutation(() =>
        Promise.all(changedLanes.map((lane) => reorderLaneRequest(lane.id, lane.position))),
      )
    },
    [lanes, runMutation],
  )

  return {
    lanes,
    isLoading,
    error,
    mutationError,
    clearMutationError,
    createLane,
    renameLane,
    deleteLane,
    reorderUserLanes,
  }
}
