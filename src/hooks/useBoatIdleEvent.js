import { useEffect, useRef, useState } from 'react'
import { BOAT_IDLE_INTERVAL_MS, BOAT_DRIFT_DURATION_MS } from '../components/meadowConstants'
import { randomInRange } from '../components/meadowUtils'

export function useBoatIdleEvent(enabled) {
  const [isPlaying, setIsPlaying] = useState(false)
  const stopTimeoutIdRef = useRef(null)

  useEffect(() => {
    if (!enabled) {
      setIsPlaying(false)
      return
    }

    let scheduleTimeoutId

    function scheduleNextFire() {
      const delayMs = randomInRange(BOAT_IDLE_INTERVAL_MS.MIN, BOAT_IDLE_INTERVAL_MS.MAX)
      scheduleTimeoutId = setTimeout(() => {
        setIsPlaying(true)
        stopTimeoutIdRef.current = setTimeout(() => {
          setIsPlaying(false)
          scheduleNextFire()
        }, BOAT_DRIFT_DURATION_MS)
      }, delayMs)
    }

    scheduleNextFire()

    return () => {
      clearTimeout(scheduleTimeoutId)
      clearTimeout(stopTimeoutIdRef.current)
    }
  }, [enabled])

  return isPlaying
}
