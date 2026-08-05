import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { CARD_STATUS, REMINDER_POLL_INTERVAL_MS, SNOOZE_DURATION_MS } from '../data/constants'

vi.mock('../notifications', () => ({
  showReminderSummaryNotification: vi.fn(),
}))

const { useReminderQueue } = await import('./useReminderQueue')
const { showReminderSummaryNotification } = await import('../notifications')

const OVERDUE_REMIND_AT = '2026-08-01T09:00:00.000Z'
const FUTURE_REMIND_AT = '2026-08-01T15:00:00.000Z'
const NOW = new Date('2026-08-01T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  showReminderSummaryNotification.mockClear()
  showReminderSummaryNotification.mockReturnValue({ close: vi.fn() })
})

afterEach(() => {
  vi.useRealTimers()
})

// renderHook must be given a stable cards array and updateCard function via
// initialProps rather than freshly-literal values in an inline arrow: usePolling's
// effect depends on [callback, intervalMs], and checkForFiredReminders (the
// callback) depends on [cards], so a new cards reference on every render tears
// down and re-runs the polling effect every render. For a card whose reminder is
// already overdue, that immediately fires again and queues state, triggering
// another render, another new cards reference, and so on - an infinite render
// loop that OOMs jsdom instead of ever finishing the test.
describe('useReminderQueue', () => {
  it('queues a TODO card whose remind_at has passed', () => {
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const { result } = renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [card], updateCard: vi.fn() },
    })

    expect(result.current.firedCards).toEqual([card])
  })

  it('queues an IN_PROGRESS card whose remind_at has passed', () => {
    const card = { id: 'card-1', status: CARD_STATUS.IN_PROGRESS, remind_at: OVERDUE_REMIND_AT }
    const { result } = renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [card], updateCard: vi.fn() },
    })

    expect(result.current.firedCards).toEqual([card])
  })

  it('does not queue a card whose remind_at is in the future', () => {
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: FUTURE_REMIND_AT }
    const { result } = renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [card], updateCard: vi.fn() },
    })

    expect(result.current.firedCards).toEqual([])
  })

  it('does not queue a card with no reminder set', () => {
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: null }
    const { result } = renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [card], updateCard: vi.fn() },
    })

    expect(result.current.firedCards).toEqual([])
  })

  it('does not queue a card that is already COMPLETED or DELAYED', () => {
    const completedCard = { id: 'card-1', status: CARD_STATUS.COMPLETED, remind_at: OVERDUE_REMIND_AT }
    const delayedCard = { id: 'card-2', status: CARD_STATUS.DELAYED, remind_at: OVERDUE_REMIND_AT }
    const { result } = renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [completedCard, delayedCard], updateCard: vi.fn() },
    })

    expect(result.current.firedCards).toEqual([])
  })

  it('queues multiple cards that fire close together into one list', () => {
    const cardOne = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const cardTwo = { id: 'card-2', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const { result } = renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [cardOne, cardTwo], updateCard: vi.fn() },
    })

    expect(result.current.firedCards).toEqual([cardOne, cardTwo])
  })

  it('re-checks on the polling interval', async () => {
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: FUTURE_REMIND_AT }
    const { result, rerender } = renderHook(({ cards }) => useReminderQueue(cards, vi.fn()), {
      initialProps: { cards: [card] },
    })

    expect(result.current.firedCards).toEqual([])

    vi.setSystemTime(new Date(FUTURE_REMIND_AT).getTime() + 1000)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REMINDER_POLL_INTERVAL_MS)
    })
    rerender({ cards: [card] })

    expect(result.current.firedCards).toEqual([card])
  })

  it('dismissCard removes a card from the fired queue without updating it', () => {
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const updateCard = vi.fn()
    const { result } = renderHook(({ cards }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [card] },
    })

    act(() => {
      result.current.dismissCard('card-1')
    })

    expect(result.current.firedCards).toEqual([])
    expect(updateCard).not.toHaveBeenCalled()
  })

  it('does not re-queue a dismissed card on the next poll while remind_at is unchanged', async () => {
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const { result, rerender } = renderHook(({ cards }) => useReminderQueue(cards, vi.fn()), {
      initialProps: { cards: [card] },
    })

    act(() => {
      result.current.dismissCard('card-1')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REMINDER_POLL_INTERVAL_MS)
    })
    rerender({ cards: [card] })

    expect(result.current.firedCards).toEqual([])
  })

  it('snoozeCard updates remind_at to now plus the snooze duration and clears the fired state', async () => {
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const updateCard = vi.fn().mockResolvedValue({ ...card, remind_at: 'new-time' })
    const { result } = renderHook(({ cards }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [card] },
    })

    await act(async () => {
      await result.current.snoozeCard('card-1', SNOOZE_DURATION_MS.FIFTEEN_MINUTES)
    })

    expect(updateCard).toHaveBeenCalledWith('card-1', {
      remind_at: new Date(NOW.getTime() + SNOOZE_DURATION_MS.FIFTEEN_MINUTES).toISOString(),
    })
    expect(result.current.firedCards).toEqual([])
  })

  it('shows one summary OS notification with the total count when cards fire together', () => {
    const cardOne = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const cardTwo = { id: 'card-2', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [cardOne, cardTwo], updateCard: vi.fn() },
    })

    expect(showReminderSummaryNotification).toHaveBeenCalledTimes(1)
    expect(showReminderSummaryNotification).toHaveBeenCalledWith(2)
  })

  it('does not re-show a notification on a subsequent poll for an already-acknowledged card', async () => {
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const { result, rerender } = renderHook(({ cards }) => useReminderQueue(cards, vi.fn()), {
      initialProps: { cards: [card] },
    })

    expect(showReminderSummaryNotification).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.dismissCard('card-1')
    })
    showReminderSummaryNotification.mockClear()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REMINDER_POLL_INTERVAL_MS)
    })
    rerender({ cards: [card] })

    expect(showReminderSummaryNotification).not.toHaveBeenCalled()
  })

  it('re-shows the summary with an updated lower count when one of several cards is dismissed', () => {
    const cardOne = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const cardTwo = { id: 'card-2', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const { result } = renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [cardOne, cardTwo], updateCard: vi.fn() },
    })

    act(() => {
      result.current.dismissCard('card-1')
    })

    expect(showReminderSummaryNotification).toHaveBeenLastCalledWith(1)
  })

  it('closes the tracked notification once the last unacknowledged card is dismissed', () => {
    const notificationInstance = { close: vi.fn() }
    showReminderSummaryNotification.mockReturnValue(notificationInstance)
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const { result } = renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [card], updateCard: vi.fn() },
    })

    act(() => {
      result.current.dismissCard('card-1')
    })

    expect(notificationInstance.close).toHaveBeenCalledTimes(1)
  })

  it('does not stack a fresh notification per re-render when cards update in quick succession (pileup regression)', () => {
    const cardOne = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const cardTwo = { id: 'card-2', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const { rerender } = renderHook(({ cards, updateCard }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [cardOne, cardTwo], updateCard: vi.fn() },
    })

    expect(showReminderSummaryNotification).toHaveBeenCalledTimes(1)

    // Simulate useStatusAutomation flipping cardOne to DELAYED, producing a
    // new cards reference; cardTwo is still overdue and unacknowledged.
    const delayedCardOne = { ...cardOne, status: CARD_STATUS.DELAYED }
    rerender({ cards: [delayedCardOne, cardTwo] })

    // Still only ever one OS notification tagged as the summary, not a
    // second stacked one for cardTwo alone.
    expect(showReminderSummaryNotification).toHaveBeenCalledTimes(1)
  })

  it('re-queues a card once it fires again after being snoozed to a new overdue time', async () => {
    const card = { id: 'card-1', status: CARD_STATUS.TODO, remind_at: OVERDUE_REMIND_AT }
    const updateCard = vi.fn().mockResolvedValue({})
    const { result, rerender } = renderHook(({ cards }) => useReminderQueue(cards, updateCard), {
      initialProps: { cards: [card] },
    })

    await act(async () => {
      await result.current.snoozeCard('card-1', SNOOZE_DURATION_MS.FIVE_MINUTES)
    })
    expect(result.current.firedCards).toEqual([])

    const reSnoozedRemindAt = new Date(NOW.getTime() + SNOOZE_DURATION_MS.FIVE_MINUTES).toISOString()
    const snoozedCard = { ...card, remind_at: reSnoozedRemindAt }

    vi.setSystemTime(new Date(reSnoozedRemindAt).getTime() + 1000)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REMINDER_POLL_INTERVAL_MS)
    })
    rerender({ cards: [snoozedCard] })

    expect(result.current.firedCards).toEqual([snoozedCard])
  })
})
