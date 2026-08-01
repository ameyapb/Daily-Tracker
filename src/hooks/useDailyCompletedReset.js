import { useEffect, useRef } from 'react'
import { archiveCard, isFromPreviousLocalDay } from '../data/archive'
import { SYSTEM_LANE_TYPE } from '../data/constants'

function completedCardsFromPreviousDay(cards, completedLaneId) {
  return cards.filter(
    (card) => card.lane_id === completedLaneId && isFromPreviousLocalDay(card.completed_at),
  )
}

// Runs once per mount (guarded by hasRun, not an interval) since the reset only
// needs to happen once when the board is opened on a new day.
export function useDailyCompletedReset(lanes, cards, deleteCard) {
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    if (lanes.length === 0 || cards.length === 0) return

    const completedLane = lanes.find((lane) => lane.system_type === SYSTEM_LANE_TYPE.COMPLETED)
    if (!completedLane) return

    hasRun.current = true

    completedCardsFromPreviousDay(cards, completedLane.id).forEach(async (card) => {
      await archiveCard(card)
      await deleteCard(card.id)
    })
  }, [lanes, cards, deleteCard])
}
