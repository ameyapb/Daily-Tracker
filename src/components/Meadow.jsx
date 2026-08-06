import { useEffect, useMemo } from 'react'
import Lottie from 'lottie-react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { useBushIdleEvent } from '../hooks/useBushIdleEvent'
import { useBoatIdleEvent } from '../hooks/useBoatIdleEvent'
import {
  MEADOW_STRIP_HEIGHT_PX,
  WOODLAND_RABBIT_COUNT,
  WOODLAND_BUSH_COUNT,
  RABBIT_HOP_DURATION_MS,
  RABBIT_HOP_DELAY_MS,
  COMPLETION_BUSH_LEFT_PERCENT,
  BOAT_VIGNETTE_ASSETS_PATH,
  BOAT_VIGNETTE_DISPLAY_SCALE,
  BOAT_VIGNETTE_IMAGE_FILENAMES,
  BOAT_VIGNETTE_RENDER_WIDTH_PX,
  BOAT_VIGNETTE_RENDER_HEIGHT_PX,
  BOAT_VIGNETTE_RENDER_TOP_OFFSET_PX,
  BOAT_CSS_DRIFT_DURATION_MS,
  FIREFLY_COUNT,
  FIREFLY_DRIFT_DURATION_MS,
  FIREFLY_TWINKLE_DURATION_MS,
} from './meadowConstants'
import { randomInRange, randomTiming } from './meadowUtils'
import squeezeBunnyAnimation from '../assets/lottie/squeeze-bunny.json'
import babyRabbitAnimation from '../assets/lottie/baby-rabbit.json'
import boatVignetteAnimation from '../assets/lottie/cute-bunnies-in-the-boat.json'
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

function useFireflyTimings(count) {
  return useMemo(
    () =>
      Array.from({ length: count }, () => ({
        drift: randomTiming(FIREFLY_DRIFT_DURATION_MS, { MIN: 0, MAX: FIREFLY_DRIFT_DURATION_MS.MAX }),
        twinkle: randomTiming(FIREFLY_TWINKLE_DURATION_MS, { MIN: 0, MAX: FIREFLY_TWINKLE_DURATION_MS.MAX }),
        leftPercent: randomInRange(0, 100),
        topPercent: randomInRange(10, 80),
      })),
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

function useBoatVignetteImagePreload() {
  useEffect(() => {
    const preloadedImages = BOAT_VIGNETTE_IMAGE_FILENAMES.map((filename) => {
      const image = new Image()
      image.src = `${BOAT_VIGNETTE_ASSETS_PATH}${filename}`
      return image
    })

    return () => {
      preloadedImages.forEach((image) => {
        image.src = ''
      })
    }
  }, [])
}

function BoatVignette({ enabled }) {
  const isPlaying = useBoatIdleEvent(enabled)
  useBoatVignetteImagePreload()

  return (
    <div className="meadow__boat-viewport">
      {isPlaying && (
        <div
          className="meadow__boat"
          style={{
            '--boat-vignette-render-width-px': `${BOAT_VIGNETTE_RENDER_WIDTH_PX}px`,
            '--boat-vignette-render-height-px': `${BOAT_VIGNETTE_RENDER_HEIGHT_PX}px`,
            '--boat-vignette-render-top-offset-px': `${BOAT_VIGNETTE_RENDER_TOP_OFFSET_PX}px`,
            '--boat-vignette-display-scale': BOAT_VIGNETTE_DISPLAY_SCALE,
            animationDuration: `${BOAT_CSS_DRIFT_DURATION_MS}ms`,
          }}
        >
          <Lottie
            className="meadow__boat-animation"
            animationData={boatVignetteAnimation}
            assetsPath={BOAT_VIGNETTE_ASSETS_PATH}
            loop
            autoplay
          />
        </div>
      )}
    </div>
  )
}

export function Meadow({ completionSignal = null }) {
  const rabbitTimings = useRabbitTimings(WOODLAND_RABBIT_COUNT)
  const bushPositions = useBushPositions(WOODLAND_BUSH_COUNT)
  const fireflyTimings = useFireflyTimings(FIREFLY_COUNT)
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div
      className="meadow"
      style={{ '--meadow-height-px': `${MEADOW_STRIP_HEIGHT_PX}px` }}
      aria-hidden="true"
    >
      <div className="meadow__grass" />
      <BoatVignette enabled={!prefersReducedMotion} />
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
      {fireflyTimings.map((timing, index) => (
        <div
          key={index}
          className="meadow__firefly"
          style={{
            left: `${timing.leftPercent}%`,
            top: `${timing.topPercent}%`,
            '--firefly-drift-duration': `${timing.drift.durationMs}ms`,
            '--firefly-drift-delay': `${timing.drift.delayMs}ms`,
            '--firefly-twinkle-duration': `${timing.twinkle.durationMs}ms`,
            '--firefly-twinkle-delay': `${timing.twinkle.delayMs}ms`,
          }}
        />
      ))}
    </div>
  )
}
