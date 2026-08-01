import { useMemo } from 'react'
import Lottie from 'lottie-react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { useBushIdleEvent } from '../hooks/useBushIdleEvent'
import {
  MEADOW_STRIP_HEIGHT_PX,
  WOODLAND_RABBIT_COUNT,
  WOODLAND_BUSH_COUNT,
  RABBIT_HOP_DURATION_MS,
  RABBIT_HOP_DELAY_MS,
  COMPLETION_BUSH_LEFT_PERCENT,
} from './meadowConstants'
import { randomInRange, randomTiming } from './meadowUtils'
import squeezeBunnyAnimation from '../assets/lottie/squeeze-bunny.json'
import babyRabbitAnimation from '../assets/lottie/baby-rabbit.json'
import './Meadow.css'

function useRabbitTimings(count) {
  return useMemo(
    () =>
      Array.from({ length: count }, () => ({
        ...randomTiming(RABBIT_HOP_DURATION_MS, RABBIT_HOP_DELAY_MS),
        leftPercent: randomInRange(0, 100),
      })),
    [count],
  )
}

function useBushPositions(count) {
  return useMemo(
    () => Array.from({ length: count }, () => ({ leftPercent: randomInRange(5, 95) })),
    [count],
  )
}

function BushIdleRabbit({ leftPercent, enabled, triggerSignal = null }) {
  const isPlaying = useBushIdleEvent(enabled, triggerSignal)

  return (
    <div className="meadow__bush" style={{ left: `${leftPercent}%` }}>
      {isPlaying && (
        <Lottie
          className="meadow__bush-rabbit-animation"
          animationData={babyRabbitAnimation}
          loop={false}
          autoplay
        />
      )}
    </div>
  )
}

export function Meadow({ completionSignal = null }) {
  const rabbitTimings = useRabbitTimings(WOODLAND_RABBIT_COUNT)
  const bushPositions = useBushPositions(WOODLAND_BUSH_COUNT)
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div
      className="meadow"
      style={{ '--meadow-height-px': `${MEADOW_STRIP_HEIGHT_PX}px` }}
      aria-hidden="true"
    >
      <div className="meadow__grass" />
      <BushIdleRabbit
        leftPercent={COMPLETION_BUSH_LEFT_PERCENT}
        enabled={!prefersReducedMotion}
        triggerSignal={completionSignal}
      />
      {bushPositions.map((position, index) => (
        <BushIdleRabbit key={index} leftPercent={position.leftPercent} enabled={!prefersReducedMotion} />
      ))}
      {rabbitTimings.map((timing, index) => (
        <div
          key={index}
          className="meadow__rabbit"
          style={{
            left: `${timing.leftPercent}%`,
            animationDuration: `${timing.durationMs}ms`,
            animationDelay: `${timing.delayMs}ms`,
          }}
        >
          <Lottie
            className="meadow__rabbit-animation"
            animationData={squeezeBunnyAnimation}
            loop={!prefersReducedMotion}
            autoplay={!prefersReducedMotion}
          />
        </div>
      ))}
    </div>
  )
}
