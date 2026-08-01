import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { CARD_STATUS, STATUS_AUTOMATION_POLL_INTERVAL_MS } from '../data/constants'

const { useStatusAutomation } = await import('./useStatusAutomation')

const OVERDUE_REMIND_AT = '2026-08-01T09:00:00.000Z'
const FUTURE_REMIND_AT = '2026-08-01T15:00:00.000Z'
const NOW = new Date('2026-08-01T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useStatusAutomation', () => {
  it('flips a TODO card with a past remind_at to DELAYED on mount', () => {
    const setCardStatus = vi.fn()
    const overdueCard = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }

    renderHook(() => useStatusAutomation([overdueCard], setCardStatus))

    expect(setCardStatus).toHaveBeenCalledWith('card-1', CARD_STATUS.DELAYED)
  })

  it('flips an IN_PROGRESS card with a past remind_at to DELAYED', () => {
    const setCardStatus = vi.fn()
    const overdueCard = { id: 'card-1', status: CARD_STATUS.IN_PROGRESS, remind_at: OVERDUE_REMIND_AT }

    renderHook(() => useStatusAutomation([overdueCard], setCardStatus))

    expect(setCardStatus).toHaveBeenCalledWith('card-1', CARD_STATUS.DELAYED)
  })

  it('does not flip a card whose remind_at is in the future', () => {
    const setCardStatus = vi.fn()
    const futureCard = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: FUTURE_REMIND_AT }

    renderHook(() => useStatusAutomation([futureCard], setCardStatus))

    expect(setCardStatus).not.toHaveBeenCalled()
  })

  it('does not flip a card with no reminder set', () => {
    const setCardStatus = vi.fn()
    const noReminderCard = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: null }

    renderHook(() => useStatusAutomation([noReminderCard], setCardStatus))

    expect(setCardStatus).not.toHaveBeenCalled()
  })

  it('does not flip cards that are already COMPLETED or DELAYED', () => {
    const setCardStatus = vi.fn()
    const completedCard = { id: 'card-1', status: CARD_STATUS.COMPLETED, remind_at: OVERDUE_REMIND_AT }
    const delayedCard = { id: 'card-2', status: CARD_STATUS.DELAYED, remind_at: OVERDUE_REMIND_AT }

    renderHook(() => useStatusAutomation([completedCard, delayedCard], setCardStatus))

    expect(setCardStatus).not.toHaveBeenCalled()
  })

  it('re-checks on the polling interval', async () => {
    const setCardStatus = vi.fn()
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: FUTURE_REMIND_AT }

    const { rerender } = renderHook(({ cards }) => useStatusAutomation(cards, setCardStatus), {
      initialProps: { cards: [card] },
    })

    expect(setCardStatus).not.toHaveBeenCalled()

    vi.setSystemTime(new Date(FUTURE_REMIND_AT).getTime() + 1000)
    await vi.advanceTimersByTimeAsync(STATUS_AUTOMATION_POLL_INTERVAL_MS)
    rerender({ cards: [card] })

    expect(setCardStatus).toHaveBeenCalledWith('card-1', CARD_STATUS.DELAYED)
  })
})
