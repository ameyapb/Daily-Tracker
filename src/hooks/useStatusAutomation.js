import { useCallback } from 'react'
import { CARD_STATUS, STATUS_AUTOMATION_POLL_INTERVAL_MS, isCardReminderDue } from '../data/constants'
import { usePolling } from './usePolling'

// Runs on mount and on an interval (not just on load) so a card also flips to
// DELAYED if its remind_at passes while the tab stays open.
export function useStatusAutomation(cards, setCardStatus) {
  const delayOverdueCards = useCallback(() => {
    const now = Date.now()
    cards.filter((card) => isCardReminderDue(card, now)).forEach((card) => {
      setCardStatus(card.id, CARD_STATUS.DELAYED)
    })
  }, [cards, setCardStatus])

  usePolling(delayOverdueCards, STATUS_AUTOMATION_POLL_INTERVAL_MS)
}
