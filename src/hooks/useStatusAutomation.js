import { useEffect } from 'react'
import { CARD_STATUS, STATUS_AUTOMATION_POLL_INTERVAL_MS } from '../data/constants'

const STATUSES_ELIGIBLE_FOR_AUTO_DELAY = [CARD_STATUS.TODO, CARD_STATUS.IN_PROGRESS]

function isOverdue(card, now) {
  return (
    STATUSES_ELIGIBLE_FOR_AUTO_DELAY.includes(card.status) &&
    card.remind_at !== null &&
    new Date(card.remind_at).getTime() <= now
  )
}

// Runs on mount and on an interval (not just on load) so a card also flips to
// DELAYED if its remind_at passes while the tab stays open.
export function useStatusAutomation(cards, setCardStatus) {
  useEffect(() => {
    function delayOverdueCards() {
      const now = Date.now()
      cards.filter((card) => isOverdue(card, now)).forEach((card) => {
        setCardStatus(card.id, CARD_STATUS.DELAYED)
      })
    }

    delayOverdueCards()
    const intervalId = setInterval(delayOverdueCards, STATUS_AUTOMATION_POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [cards, setCardStatus])
}
