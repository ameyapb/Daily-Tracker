import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { CARD_STATUS } from '../data/constants'

vi.mock('../data/cards', () => ({
  fetchCards: vi.fn(),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  moveCardToLane: vi.fn(),
  reorderCard: vi.fn(),
  setCardStatus: vi.fn(),
}))

const {
  fetchCards,
  createCard: createCardRequest,
  updateCard: updateCardRequest,
  deleteCard: deleteCardRequest,
  moveCardToLane: moveCardToLaneRequest,
  reorderCard: reorderCardRequest,
  setCardStatus: setCardStatusRequest,
} = await import('../data/cards')
const { useCards } = await import('./useCards')

const WORK_LANE_ID = 'lane-1'
const HOME_LANE_ID = 'lane-2'

const TASK_ONE = { id: 'card-1', lane_id: WORK_LANE_ID, name: 'Task one', status: CARD_STATUS.TODO, position: 0 }
const TASK_TWO = { id: 'card-2', lane_id: WORK_LANE_ID, name: 'Task two', status: CARD_STATUS.TODO, position: 1 }
const TASK_THREE = { id: 'card-3', lane_id: HOME_LANE_ID, name: 'Task three', status: CARD_STATUS.TODO, position: 0 }

beforeEach(() => {
  fetchCards.mockReset()
  createCardRequest.mockReset()
  updateCardRequest.mockReset()
  deleteCardRequest.mockReset()
  moveCardToLaneRequest.mockReset()
  reorderCardRequest.mockReset()
  setCardStatusRequest.mockReset()
})

async function renderLoadedCards(cards) {
  fetchCards.mockResolvedValue(cards)
  const hook = renderHook(() => useCards())
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
  return hook
}

describe('useCards', () => {
  it('loads cards on mount', async () => {
    const { result } = await renderLoadedCards([TASK_ONE, TASK_TWO])

    expect(result.current.cards).toEqual([TASK_ONE, TASK_TWO])
    expect(result.current.error).toBeNull()
  })

  it('captures an error when loading fails', async () => {
    const error = new Error('load failed')
    fetchCards.mockRejectedValue(error)

    const { result } = renderHook(() => useCards())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe(error)
  })

  it('creates a card positioned after the last card in the lane', async () => {
    const { result } = await renderLoadedCards([TASK_ONE, TASK_TWO])
    const created = { id: 'card-4', lane_id: WORK_LANE_ID, name: 'Task four', position: 2 }
    createCardRequest.mockResolvedValue(created)

    await act(async () => {
      await result.current.createCard(WORK_LANE_ID, { name: 'Task four' })
    })

    expect(createCardRequest).toHaveBeenCalledWith({
      laneId: WORK_LANE_ID,
      name: 'Task four',
      description: undefined,
      remindAt: undefined,
      status: undefined,
      position: 2,
    })
    expect(result.current.cards).toContainEqual(created)
  })

  it('creates the first card in an empty lane at position 0', async () => {
    const { result } = await renderLoadedCards([])
    createCardRequest.mockResolvedValue(TASK_ONE)

    await act(async () => {
      await result.current.createCard(WORK_LANE_ID, { name: 'Task one' })
    })

    expect(createCardRequest).toHaveBeenCalledWith(
      expect.objectContaining({ position: 0 }),
    )
  })

  it('updates non-status fields via updateCard without touching status', async () => {
    const { result } = await renderLoadedCards([TASK_ONE])
    const updated = { ...TASK_ONE, name: 'Renamed' }
    updateCardRequest.mockResolvedValue(updated)

    await act(async () => {
      await result.current.updateCard('card-1', { name: 'Renamed', status: CARD_STATUS.TODO })
    })

    expect(updateCardRequest).toHaveBeenCalledWith('card-1', { name: 'Renamed' })
    expect(setCardStatusRequest).not.toHaveBeenCalled()
    expect(result.current.cards).toContainEqual(updated)
  })

  it('routes a status change through setCardStatus so the system lane move happens', async () => {
    const { result } = await renderLoadedCards([TASK_ONE])
    const delayed = { ...TASK_ONE, status: CARD_STATUS.DELAYED, lane_id: 'sys-delayed' }
    updateCardRequest.mockResolvedValue(TASK_ONE)
    setCardStatusRequest.mockResolvedValue(delayed)

    await act(async () => {
      await result.current.updateCard('card-1', { name: 'Task one', status: CARD_STATUS.DELAYED })
    })

    expect(setCardStatusRequest).toHaveBeenCalledWith('card-1', CARD_STATUS.DELAYED)
    expect(result.current.cards).toContainEqual(delayed)
  })

  it('deletes a card and removes it from local state', async () => {
    const { result } = await renderLoadedCards([TASK_ONE, TASK_TWO])
    deleteCardRequest.mockResolvedValue(undefined)

    await act(async () => {
      await result.current.deleteCard('card-1')
    })

    expect(deleteCardRequest).toHaveBeenCalledWith('card-1')
    expect(result.current.cards).toEqual([TASK_TWO])
  })

  it('moves a card to another lane at the next available position', async () => {
    const { result } = await renderLoadedCards([TASK_ONE, TASK_THREE])
    const moved = { ...TASK_ONE, lane_id: HOME_LANE_ID, position: 1 }
    moveCardToLaneRequest.mockResolvedValue(moved)

    await act(async () => {
      await result.current.moveCardToLane('card-1', HOME_LANE_ID)
    })

    expect(moveCardToLaneRequest).toHaveBeenCalledWith('card-1', HOME_LANE_ID, 1)
    expect(result.current.cards).toContainEqual(moved)
  })

  it('reorders cards within a lane and persists only changed positions', async () => {
    const { result } = await renderLoadedCards([TASK_ONE, TASK_TWO, TASK_THREE])
    reorderCardRequest.mockResolvedValue({})

    await act(async () => {
      await result.current.reorderCardsInLane(WORK_LANE_ID, ['card-2', 'card-1'])
    })

    expect(reorderCardRequest).toHaveBeenCalledTimes(2)
    expect(reorderCardRequest).toHaveBeenCalledWith('card-2', 0)
    expect(reorderCardRequest).toHaveBeenCalledWith('card-1', 1)

    const workLaneCards = result.current.cards.filter((card) => card.lane_id === WORK_LANE_ID)
    expect(workLaneCards.map((card) => card.id)).toEqual(['card-2', 'card-1'])
  })

  it('does not persist a card whose position is unchanged by reordering', async () => {
    const { result } = await renderLoadedCards([TASK_ONE, TASK_TWO])
    reorderCardRequest.mockResolvedValue({})

    await act(async () => {
      await result.current.reorderCardsInLane(WORK_LANE_ID, ['card-1', 'card-2'])
    })

    expect(reorderCardRequest).not.toHaveBeenCalled()
  })

  it('sets card status directly and updates local state', async () => {
    const { result } = await renderLoadedCards([TASK_ONE])
    const completed = { ...TASK_ONE, status: CARD_STATUS.COMPLETED, lane_id: 'sys-completed' }
    setCardStatusRequest.mockResolvedValue(completed)

    await act(async () => {
      await result.current.setCardStatus('card-1', CARD_STATUS.COMPLETED)
    })

    expect(setCardStatusRequest).toHaveBeenCalledWith('card-1', CARD_STATUS.COMPLETED)
    expect(result.current.cards).toContainEqual(completed)
  })

  it('moving a card out of a system lane resets status to IN_PROGRESS and lands it on the dropped lane', async () => {
    const completedCard = { ...TASK_ONE, status: CARD_STATUS.COMPLETED, lane_id: 'sys-completed' }
    const { result } = await renderLoadedCards([completedCard, TASK_THREE])
    const inProgress = { ...completedCard, status: CARD_STATUS.IN_PROGRESS, lane_id: 'sys-completed' }
    const moved = { ...inProgress, lane_id: HOME_LANE_ID, position: 1 }
    setCardStatusRequest.mockResolvedValue(inProgress)
    moveCardToLaneRequest.mockResolvedValue(moved)

    await act(async () => {
      await result.current.moveCardOutOfSystemLane('card-1', HOME_LANE_ID)
    })

    expect(setCardStatusRequest).toHaveBeenCalledWith('card-1', CARD_STATUS.IN_PROGRESS)
    expect(moveCardToLaneRequest).toHaveBeenCalledWith('card-1', HOME_LANE_ID, 1)
    expect(result.current.cards).toContainEqual(moved)
  })
})
