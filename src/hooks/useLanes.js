import { useCallback, useEffect, useState } from 'react'
import {
  fetchLanes,
  createLane as createLaneRequest,
  renameLane as renameLaneRequest,
  reorderLane as reorderLaneRequest,
  deleteLane as deleteLaneRequest,
} from '../data/lanes'

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
      const created = await createLaneRequest({ name, position: nextUserLanePosition(lanes) })
      setLanes((currentLanes) => [...currentLanes, created])
    },
    [lanes],
  )

  const renameLane = useCallback(async (laneId, name) => {
    const updated = await renameLaneRequest(laneId, name)
    setLanes((currentLanes) => currentLanes.map((lane) => (lane.id === laneId ? updated : lane)))
  }, [])

  const deleteLane = useCallback(async (laneId) => {
    await deleteLaneRequest(laneId)
    setLanes((currentLanes) => currentLanes.filter((lane) => lane.id !== laneId))
  }, [])

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

      await Promise.all(changedLanes.map((lane) => reorderLaneRequest(lane.id, lane.position)))
    },
    [lanes],
  )

  return { lanes, isLoading, error, createLane, renameLane, deleteLane, reorderUserLanes }
}
