import { describe, it, expect } from 'vitest'
import { CARD_STATUS, SYSTEM_LANE_TYPE, STATUS_TO_SYSTEM_LANE_TYPE, isCardReminderDue } from './constants'

describe('STATUS_TO_SYSTEM_LANE_TYPE', () => {
  it('maps DELAYED status to the delayed system lane type', () => {
    expect(STATUS_TO_SYSTEM_LANE_TYPE[CARD_STATUS.DELAYED]).toBe(SYSTEM_LANE_TYPE.DELAYED)
  })

  it('maps COMPLETED status to the completed system lane type', () => {
    expect(STATUS_TO_SYSTEM_LANE_TYPE[CARD_STATUS.COMPLETED]).toBe(SYSTEM_LANE_TYPE.COMPLETED)
  })

  it('has no mapping for TODO or IN_PROGRESS, which have no system lane', () => {
    expect(STATUS_TO_SYSTEM_LANE_TYPE[CARD_STATUS.TODO]).toBeUndefined()
    expect(STATUS_TO_SYSTEM_LANE_TYPE[CARD_STATUS.IN_PROGRESS]).toBeUndefined()
  })
})

describe('isCardReminderDue', () => {
  const NOW = new Date('2026-08-01T12:00:00.000Z').getTime()
  const OVERDUE_REMIND_AT = '2026-08-01T09:00:00.000Z'
  const FUTURE_REMIND_AT = '2026-08-01T15:00:00.000Z'

  it('is true for a TODO card whose remind_at has passed', () => {
    const card = { status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    expect(isCardReminderDue(card, NOW)).toBe(true)
  })

  it('is true for an IN_PROGRESS card whose remind_at has passed', () => {
    const card = { status: CARD_STATUS.IN_PROGRESS, remind_at: OVERDUE_REMIND_AT }
    expect(isCardReminderDue(card, NOW)).toBe(true)
  })

  it('is false when remind_at is in the future', () => {
    const card = { status: CARD_STATUS.TODO, remind_at: FUTURE_REMIND_AT }
    expect(isCardReminderDue(card, NOW)).toBe(false)
  })

  it('is false when remind_at is null', () => {
    const card = { status: CARD_STATUS.TODO, remind_at: null }
    expect(isCardReminderDue(card, NOW)).toBe(false)
  })

  it('is false for a COMPLETED or DELAYED card even if remind_at has passed', () => {
    expect(isCardReminderDue({ status: CARD_STATUS.COMPLETED, remind_at: OVERDUE_REMIND_AT }, NOW)).toBe(false)
    expect(isCardReminderDue({ status: CARD_STATUS.DELAYED, remind_at: OVERDUE_REMIND_AT }, NOW)).toBe(false)
  })
})
