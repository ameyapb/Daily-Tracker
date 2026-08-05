import { useCallback, useRef, useState } from 'react'
import { REMINDER_POLL_INTERVAL_MS, isCardReminderDue } from '../data/constants'
import { playReminderSound } from '../reminderSound'
import { showReminderSummaryNotification } from '../notifications'
import { usePolling } from './usePolling'

// Tracks which card ids have already fired so a reminder is only queued once
// per remind_at value, not on every poll while it's still overdue.
export function useReminderQueue(cards, updateCard) {
  const [firedCardIds, setFiredCardIds] = useState([])
  const acknowledgedRemindAtByCardId = useRef(new Map())
  const summaryNotificationRef = useRef(null)
  // Mirrors firedCardIds for checkForFiredReminders to read without depending
  // on the firedCardIds state value itself: checkForFiredReminders feeds
  // usePolling, whose effect deps are [callback, intervalMs], so a callback
  // that depended on firedCardIds would tear down and immediately re-run the
  // polling effect on every fire - and for an already-overdue card that
  // re-fires it right away, an infinite render loop (the same failure mode
  // documented in the "Running the full suite" section of CLAUDE.md, there
  // caused by depending on `cards` instead).
  const firedCardIdsRef = useRef([])

  // Shows/updates a single tagged OS notification reflecting the current
  // unacknowledged count, or closes it once nothing is left unacknowledged.
  // Keeping this keyed off the total (not just newly-fired cards) is what
  // stops repeated notifications when checkForFiredReminders re-runs across
  // several quick re-renders (e.g. useStatusAutomation flipping overdue
  // cards to DELAYED one at a time): the OS notification is replaced in
  // place via its tag instead of stacking a new one each time.
  const syncSummaryNotification = useCallback((unacknowledgedCount) => {
    if (unacknowledgedCount === 0) {
      summaryNotificationRef.current?.close()
      summaryNotificationRef.current = null
      return
    }
    summaryNotificationRef.current = showReminderSummaryNotification(unacknowledgedCount) ?? null
  }, [])

  const checkForFiredReminders = useCallback(() => {
    const now = Date.now()
    const newlyFiredCards = cards.filter((card) => {
      if (!isCardReminderDue(card, now)) return false
      return acknowledgedRemindAtByCardId.current.get(card.id) !== card.remind_at
    })

    const trulyNewCardIds = newlyFiredCards
      .map((card) => card.id)
      .filter((cardId) => !firedCardIdsRef.current.includes(cardId))

    if (trulyNewCardIds.length > 0) {
      const updatedIds = [...firedCardIdsRef.current, ...trulyNewCardIds]
      firedCardIdsRef.current = updatedIds
      setFiredCardIds(updatedIds)
      playReminderSound()
      syncSummaryNotification(updatedIds.length)
    }
  }, [cards, syncSummaryNotification])

  usePolling(checkForFiredReminders, REMINDER_POLL_INTERVAL_MS)

  function acknowledge(cardId) {
    const card = cards.find((currentCard) => currentCard.id === cardId)
    if (card) acknowledgedRemindAtByCardId.current.set(cardId, card.remind_at)
    const updatedIds = firedCardIdsRef.current.filter((id) => id !== cardId)
    firedCardIdsRef.current = updatedIds
    setFiredCardIds(updatedIds)
    syncSummaryNotification(updatedIds.length)
  }

  async function snoozeCard(cardId, snoozeDurationMs) {
    const card = cards.find((currentCard) => currentCard.id === cardId)
    if (!card) return
    const remindAt = new Date(Date.now() + snoozeDurationMs).toISOString()
    acknowledge(cardId)
    await updateCard(cardId, { remind_at: remindAt })
  }

  function dismissCard(cardId) {
    acknowledge(cardId)
  }

  const firedCards = firedCardIds
    .map((cardId) => cards.find((card) => card.id === cardId))
    .filter((card) => card !== undefined)

  return { firedCards, snoozeCard, dismissCard }
}
