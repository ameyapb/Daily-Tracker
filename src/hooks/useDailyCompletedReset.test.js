import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { CARD_STATUS, SYSTEM_LANE_TYPE } from '../data/constants'

vi.mock('../data/archive', () => ({
  archiveCard: vi.fn(),
  isFromPreviousLocalDay: vi.fn(),
}))

const { archiveCard, isFromPreviousLocalDay } = await import('../data/archive')
const { useDailyCompletedReset } = await import('./useDailyCompletedReset')

const COMPLETED_LANE = { id: 'sys-completed', is_system: true, system_type: SYSTEM_LANE_TYPE.COMPLETED }
const DELAYED_LANE = { id: 'sys-delayed', is_system: true, system_type: SYSTEM_LANE_TYPE.DELAYED }

const TODAY_COMPLETED_CARD = {
  id: 'card-1',
  lane_id: COMPLETED_LANE.id,
  status: CARD_STATUS.COMPLETED,
  completed_at: '2026-08-01T10:00:00.000Z',
}
const YESTERDAY_COMPLETED_CARD = {
  id: 'card-2',
  lane_id: COMPLETED_LANE.id,
  status: CARD_STATUS.COMPLETED,
  completed_at: '2026-07-31T10:00:00.000Z',
}
const DELAYED_CARD = {
  id: 'card-3',
  lane_id: DELAYED_LANE.id,
  status: CARD_STATUS.DELAYED,
  completed_at: null,
}

beforeEach(() => {
  archiveCard.mockReset()
  isFromPreviousLocalDay.mockReset()
  isFromPreviousLocalDay.mockImplementation((isoString) => isoString === YESTERDAY_COMPLETED_CARD.completed_at)
})

describe('useDailyCompletedReset', () => {
  it('archives and deletes a completed card left over from a previous day', async () => {
    archiveCard.mockResolvedValue({})
    const deleteCard = vi.fn().mockResolvedValue(undefined)

    renderHook(() =>
      useDailyCompletedReset([COMPLETED_LANE, DELAYED_LANE], [YESTERDAY_COMPLETED_CARD], deleteCard),
    )

    await waitFor(() => expect(deleteCard).toHaveBeenCalledWith('card-2'))
    expect(archiveCard).toHaveBeenCalledWith(YESTERDAY_COMPLETED_CARD)
  })

  it('leaves a card completed today untouched', () => {
    const deleteCard = vi.fn()

    renderHook(() => useDailyCompletedReset([COMPLETED_LANE, DELAYED_LANE], [TODAY_COMPLETED_CARD], deleteCard))

    expect(deleteCard).not.toHaveBeenCalled()
    expect(archiveCard).not.toHaveBeenCalled()
  })

  it('ignores cards outside the COMPLETED system lane', () => {
    const deleteCard = vi.fn()

    renderHook(() => useDailyCompletedReset([COMPLETED_LANE, DELAYED_LANE], [DELAYED_CARD], deleteCard))

    expect(deleteCard).not.toHaveBeenCalled()
    expect(archiveCard).not.toHaveBeenCalled()
  })

  it('does nothing while lanes or cards have not loaded yet', () => {
    const deleteCard = vi.fn()

    renderHook(() => useDailyCompletedReset([], [], deleteCard))

    expect(deleteCard).not.toHaveBeenCalled()
    expect(archiveCard).not.toHaveBeenCalled()
  })

  it('only runs the reset once even if cards update again', async () => {
    archiveCard.mockResolvedValue({})
    const deleteCard = vi.fn().mockResolvedValue(undefined)

    const { rerender } = renderHook(
      ({ cards }) => useDailyCompletedReset([COMPLETED_LANE, DELAYED_LANE], cards, deleteCard),
      { initialProps: { cards: [YESTERDAY_COMPLETED_CARD] } },
    )

    await waitFor(() => expect(deleteCard).toHaveBeenCalledTimes(1))

    rerender({ cards: [YESTERDAY_COMPLETED_CARD, TODAY_COMPLETED_CARD] })

    expect(deleteCard).toHaveBeenCalledTimes(1)
  })
})
