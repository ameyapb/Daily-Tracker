import { useEffect, useRef, useState } from 'react'
import { CARD_STATUS } from '../data/constants'
import { RABBIT_IN_A_HAT_ANIMATION_DURATION_MS } from '../components/meadowConstants'

export function useCompletionCelebration(status, enabled) {
  const [isPlaying, setIsPlaying] = useState(false)
  const previousStatusRef = useRef(status)

  useEffect(() => {
    const justCompleted = status === CARD_STATUS.COMPLETED && previousStatusRef.current !== CARD_STATUS.COMPLETED
    previousStatusRef.current = status

    if (!justCompleted || !enabled) return

    setIsPlaying(true)
    const timeoutId = setTimeout(() => setIsPlaying(false), RABBIT_IN_A_HAT_ANIMATION_DURATION_MS)
    return () => clearTimeout(timeoutId)
  }, [status, enabled])

  return isPlaying
}
