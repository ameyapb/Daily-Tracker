import { useEffect, useRef, useState } from 'react'
import { RABBIT_IDLE_BEHAVIOR_INTERVAL_MS, BABY_RABBIT_ANIMATION_DURATION_MS } from '../components/meadowConstants'
import { randomInRange } from '../components/meadowUtils'

export function useBushIdleEvent(enabled, triggerSignal = null) {
  const [isPlaying, setIsPlaying] = useState(false)
  const lastFiredSignalRef = useRef(null)

  useEffect(() => {
    if (!enabled) {
      setIsPlaying(false)
      return
    }

    let playTimeoutId
    let scheduleTimeoutId

    function scheduleNextFire() {
      const delayMs = randomInRange(RABBIT_IDLE_BEHAVIOR_INTERVAL_MS.MIN, RABBIT_IDLE_BEHAVIOR_INTERVAL_MS.MAX)
      scheduleTimeoutId = setTimeout(() => {
        setIsPlaying(true)
        playTimeoutId = setTimeout(() => {
          setIsPlaying(false)
          scheduleNextFire()
        }, BABY_RABBIT_ANIMATION_DURATION_MS)
      }, delayMs)
    }

    scheduleNextFire()

    return () => {
      clearTimeout(scheduleTimeoutId)
      clearTimeout(playTimeoutId)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || triggerSignal === null || triggerSignal === lastFiredSignalRef.current) return

    lastFiredSignalRef.current = triggerSignal
    setIsPlaying(true)
    const timeoutId = setTimeout(() => setIsPlaying(false), BABY_RABBIT_ANIMATION_DURATION_MS)

    return () => clearTimeout(timeoutId)
  }, [enabled, triggerSignal])

  return isPlaying
}
