import { useCallback, useRef, useState } from 'react'
import { REMINDER_POLL_INTERVAL_MS, isCardReminderDue } from '../data/constants'
import { playReminderSound } from '../reminderSound'
import { showReminderNotification } from '../notifications'
import { usePolling } from './usePolling'

// Tracks which card ids have already fired so a reminder is only queued once
// per remind_at value, not on every poll while it's still overdue.
export function useReminderQueue(cards, updateCard) {
  const [firedCardIds, setFiredCardIds] = useState([])
  const acknowledgedRemindAtByCardId = useRef(new Map())

  const checkForFiredReminders = useCallback(() => {
    const now = Date.now()
    const newlyFiredCards = cards.filter((card) => {
      if (!isCardReminderDue(card, now)) return false
      return acknowledgedRemindAtByCardId.current.get(card.id) !== card.remind_at
    })

    if (newlyFiredCards.length > 0) {
      setFiredCardIds((currentIds) => [
        ...new Set([...currentIds, ...newlyFiredCards.map((card) => card.id)]),
      ])
      playReminderSound()
      newlyFiredCards.forEach((card) => showReminderNotification(card))
    }
  }, [cards])

  usePolling(checkForFiredReminders, REMINDER_POLL_INTERVAL_MS)

  function acknowledge(cardId) {
    const card = cards.find((currentCard) => currentCard.id === cardId)
    if (card) acknowledgedRemindAtByCardId.current.set(cardId, card.remind_at)
    setFiredCardIds((currentIds) => currentIds.filter((id) => id !== cardId))
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
