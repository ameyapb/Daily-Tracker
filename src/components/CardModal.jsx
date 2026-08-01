import { useState } from 'react'
import { CARD_STATUS, CARD_STATUS_OPTIONS, STATUS_LABEL } from '../data/constants'
import './CardModal.css'

const REMINDER_MODE = {
  NONE: 'none',
  RELATIVE: 'relative',
  ABSOLUTE: 'absolute',
}

const RELATIVE_UNIT = {
  MINUTES: 'minutes',
  HOURS: 'hours',
  DAYS: 'days',
}

const RELATIVE_UNIT_TO_MS = {
  [RELATIVE_UNIT.MINUTES]: 60 * 1000,
  [RELATIVE_UNIT.HOURS]: 60 * 60 * 1000,
  [RELATIVE_UNIT.DAYS]: 24 * 60 * 60 * 1000,
}

const DEFAULT_RELATIVE_AMOUNT = 1

function toDateTimeLocalValue(isoString) {
  const date = new Date(isoString)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function initialReminderMode(remindAt) {
  return remindAt ? REMINDER_MODE.ABSOLUTE : REMINDER_MODE.NONE
}

export function CardModal({ card, onSave, onDelete, onClose }) {
  const isEditing = Boolean(card)

  const [name, setName] = useState(card?.name ?? '')
  const [description, setDescription] = useState(card?.description ?? '')
  const [status, setStatus] = useState(card?.status ?? CARD_STATUS.TODO)
  const [reminderMode, setReminderMode] = useState(initialReminderMode(card?.remind_at))
  const [absoluteRemindAt, setAbsoluteRemindAt] = useState(
    card?.remind_at ? toDateTimeLocalValue(card.remind_at) : '',
  )
  const [relativeAmount, setRelativeAmount] = useState(DEFAULT_RELATIVE_AMOUNT)
  const [relativeUnit, setRelativeUnit] = useState(RELATIVE_UNIT.HOURS)

  function computeRemindAt() {
    if (reminderMode === REMINDER_MODE.NONE) return null
    if (reminderMode === REMINDER_MODE.ABSOLUTE) {
      return absoluteRemindAt ? new Date(absoluteRemindAt).toISOString() : null
    }
    const offsetMs = Number(relativeAmount) * RELATIVE_UNIT_TO_MS[relativeUnit]
    return new Date(Date.now() + offsetMs).toISOString()
  }

  function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    onSave({
      name: trimmedName,
      description: description.trim() || null,
      remindAt: computeRemindAt(),
      status,
    })
  }

  return (
    <div className="card-modal-overlay" onClick={onClose}>
      <div className="card-modal" onClick={(event) => event.stopPropagation()}>
        <h2>{isEditing ? 'Edit card' : 'New card'}</h2>

        <form onSubmit={handleSubmit}>
          <label className="card-modal__field">
            <span>Name</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Task name"
              required
            />
          </label>

          <label className="card-modal__field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional details"
              rows={3}
            />
          </label>

          <label className="card-modal__field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {CARD_STATUS_OPTIONS.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {STATUS_LABEL[statusOption]}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="card-modal__field card-modal__reminder">
            <legend>Reminder</legend>

            <div className="card-modal__reminder-mode">
              <label>
                <input
                  type="radio"
                  name="reminder-mode"
                  checked={reminderMode === REMINDER_MODE.NONE}
                  onChange={() => setReminderMode(REMINDER_MODE.NONE)}
                />
                None
              </label>
              <label>
                <input
                  type="radio"
                  name="reminder-mode"
                  checked={reminderMode === REMINDER_MODE.RELATIVE}
                  onChange={() => setReminderMode(REMINDER_MODE.RELATIVE)}
                />
                Relative
              </label>
              <label>
                <input
                  type="radio"
                  name="reminder-mode"
                  checked={reminderMode === REMINDER_MODE.ABSOLUTE}
                  onChange={() => setReminderMode(REMINDER_MODE.ABSOLUTE)}
                />
                Absolute
              </label>
            </div>

            {reminderMode === REMINDER_MODE.RELATIVE && (
              <div className="card-modal__reminder-relative">
                <span>Remind me in</span>
                <input
                  type="number"
                  min="1"
                  value={relativeAmount}
                  onChange={(event) => setRelativeAmount(event.target.value)}
                />
                <select value={relativeUnit} onChange={(event) => setRelativeUnit(event.target.value)}>
                  <option value={RELATIVE_UNIT.MINUTES}>minutes</option>
                  <option value={RELATIVE_UNIT.HOURS}>hours</option>
                  <option value={RELATIVE_UNIT.DAYS}>days</option>
                </select>
              </div>
            )}

            {reminderMode === REMINDER_MODE.ABSOLUTE && (
              <input
                type="datetime-local"
                value={absoluteRemindAt}
                onChange={(event) => setAbsoluteRemindAt(event.target.value)}
              />
            )}
          </fieldset>

          <div className="card-modal__actions">
            {isEditing && (
              <button
                type="button"
                className="card-modal__delete"
                onClick={() => onDelete(card.id)}
              >
                Delete
              </button>
            )}
            <div className="card-modal__actions-right">
              <button type="button" className="card-modal__cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="card-modal__save">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
