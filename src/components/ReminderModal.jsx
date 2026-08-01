import { useState } from 'react'
import { SNOOZE_DURATION_OPTIONS } from '../data/constants'
import './ReminderModal.css'

const MINUTES_TO_MS = 60 * 1000

function ReminderRow({ card, onSnooze, onComplete }) {
  const [customMinutes, setCustomMinutes] = useState('')

  function handleCustomSnooze(event) {
    event.preventDefault()
    const minutes = Number(customMinutes)
    if (!minutes || minutes <= 0) return
    onSnooze(card.id, minutes * MINUTES_TO_MS)
    setCustomMinutes('')
  }

  return (
    <li className="reminder-modal__row">
      <div className="reminder-modal__row-info">
        <span className="reminder-modal__row-name">{card.name}</span>
        {card.description && <span className="reminder-modal__row-description">{card.description}</span>}
      </div>

      <div className="reminder-modal__row-actions">
        <div className="reminder-modal__snooze-options">
          {SNOOZE_DURATION_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              className="reminder-modal__snooze-button button--lift"
              onClick={() => onSnooze(card.id, option.value)}
            >
              {option.label}
            </button>
          ))}
          <form className="reminder-modal__custom-snooze" onSubmit={handleCustomSnooze}>
            <input
              type="number"
              min="1"
              placeholder="Custom"
              aria-label={`Custom snooze minutes for ${card.name}`}
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
            />
            <span>min</span>
            <button type="submit" className="reminder-modal__snooze-button button--lift">
              Snooze
            </button>
          </form>
        </div>

        <button
          type="button"
          className="reminder-modal__complete-button button--lift"
          onClick={() => onComplete(card.id)}
        >
          Complete
        </button>
      </div>
    </li>
  )
}

export function ReminderModal({ cards, onSnooze, onComplete }) {
  if (cards.length === 0) return null

  return (
    <div className="reminder-modal-overlay">
      <div className="reminder-modal" role="alertdialog" aria-label="Reminders">
        <h2>Reminders</h2>
        <ul className="reminder-modal__list">
          {cards.map((card) => (
            <ReminderRow key={card.id} card={card} onSnooze={onSnooze} onComplete={onComplete} />
          ))}
        </ul>
      </div>
    </div>
  )
}
