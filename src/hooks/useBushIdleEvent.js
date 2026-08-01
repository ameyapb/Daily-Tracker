import { useEffect, useRef, useState } from 'react'
import { RABBIT_IDLE_BEHAVIOR_INTERVAL_MS, BABY_RABBIT_ANIMATION_DURATION_MS } from '../components/meadowConstants'
import { randomInRange } from '../components/meadowUtils'

export function useBushIdleEvent(enabled, triggerSignal = null) {
  const [isPlaying, setIsPlaying] = useState(false)
  const lastFiredSignalRef = useRef(null)
  const stopTimeoutIdRef = useRef(null)

  function playForOneAnimationCycle() {
    clearTimeout(stopTimeoutIdRef.current)
    setIsPlaying(true)
    stopTimeoutIdRef.current = setTimeout(() => setIsPlaying(false), BABY_RABBIT_ANIMATION_DURATION_MS)
  }

  useEffect(() => {
    if (!enabled) {
      setIsPlaying(false)
      return
    }

    let scheduleTimeoutId

    function scheduleNextFire() {
      const delayMs = randomInRange(RABBIT_IDLE_BEHAVIOR_INTERVAL_MS.MIN, RABBIT_IDLE_BEHAVIOR_INTERVAL_MS.MAX)
      scheduleTimeoutId = setTimeout(() => {
        playForOneAnimationCycle()
        scheduleNextFire()
      }, delayMs)
    }

    scheduleNextFire()

    return () => clearTimeout(scheduleTimeoutId)
  }, [enabled])

  useEffect(() => {
    if (!enabled || triggerSignal === null || triggerSignal === lastFiredSignalRef.current) return

    lastFiredSignalRef.current = triggerSignal
    playForOneAnimationCycle()
  }, [enabled, triggerSignal])

  useEffect(() => {
    return () => clearTimeout(stopTimeoutIdRef.current)
  }, [])

  return isPlaying
}
