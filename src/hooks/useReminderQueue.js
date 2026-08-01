import { useEffect, useRef, useState } from 'react'
import { CARD_STATUS, REMINDER_POLL_INTERVAL_MS } from '../data/constants'
import { playReminderSound } from '../reminderSound'

const STATUSES_ELIGIBLE_FOR_REMINDER = [CARD_STATUS.TODO, CARD_STATUS.IN_PROGRESS]

function hasReminderFired(card, now) {
  return (
    STATUSES_ELIGIBLE_FOR_REMINDER.includes(card.status) &&
    card.remind_at !== null &&
    new Date(card.remind_at).getTime() <= now
  )
}

// Tracks which card ids have already fired so a reminder is only queued once
// per remind_at value, not on every poll while it's still overdue.
export function useReminderQueue(cards, updateCard) {
  const [firedCardIds, setFiredCardIds] = useState([])
  const acknowledgedRemindAtByCardId = useRef(new Map())

  useEffect(() => {
    function checkForFiredReminders() {
      const now = Date.now()
      const newlyFiredCardIds = cards
        .filter((card) => {
          if (!hasReminderFired(card, now)) return false
          return acknowledgedRemindAtByCardId.current.get(card.id) !== card.remind_at
        })
        .map((card) => card.id)

      if (newlyFiredCardIds.length > 0) {
        setFiredCardIds((currentIds) => [...new Set([...currentIds, ...newlyFiredCardIds])])
        playReminderSound()
      }
    }

    checkForFiredReminders()
    const intervalId = setInterval(checkForFiredReminders, REMINDER_POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [cards])

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
