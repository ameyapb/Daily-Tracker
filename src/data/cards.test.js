import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createQueryBuilderMock, createSupabaseMock } from '../test/supabaseMock'
import { CARD_STATUS } from './constants'

const supabaseMock = createSupabaseMock()

vi.mock('../supabaseClient', () => ({
  supabase: supabaseMock,
}))

const fetchSystemLaneMock = vi.fn()
const fetchFirstUserLaneMock = vi.fn()
vi.mock('./lanes', () => ({
  fetchSystemLane: fetchSystemLaneMock,
  fetchFirstUserLane: fetchFirstUserLaneMock,
}))

const {
  fetchCards,
  createCard,
  updateCard,
  deleteCard,
  moveCardToLane,
  reorderCard,
  setCardStatus,
} = await import('./cards')

beforeEach(() => {
  supabaseMock.from.mockReset()
  fetchSystemLaneMock.mockReset()
  fetchFirstUserLaneMock.mockReset()
})

describe('fetchCards', () => {
  it('returns cards ordered by position', async () => {
    const cards = [{ id: '1', position: 0 }]
    const builder = createQueryBuilderMock({ data: cards, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await fetchCards()

    expect(supabaseMock.from).toHaveBeenCalledWith('cards')
    expect(builder.order).toHaveBeenCalledWith('position', { ascending: true })
    expect(result).toBe(cards)
  })

  it('throws when supabase returns an error', async () => {
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error: new Error('boom') }))

    await expect(fetchCards()).rejects.toThrow('boom')
  })
})

describe('createCard', () => {
  it('inserts a card defaulting status to TODO and nullable fields to null', async () => {
    const created = { id: '1', name: 'Task' }
    const builder = createQueryBuilderMock({ data: created, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await createCard({ laneId: 'lane-1', name: 'Task', position: 0 })

    expect(builder.insert).toHaveBeenCalledWith({
      lane_id: 'lane-1',
      name: 'Task',
      description: null,
      remind_at: null,
      status: CARD_STATUS.TODO,
      position: 0,
    })
    expect(result).toBe(created)
  })

  it('passes through description, remindAt, and status when provided', async () => {
    const created = { id: '1' }
    const builder = createQueryBuilderMock({ data: created, error: null })
    supabaseMock.from.mockReturnValue(builder)

    await createCard({
      laneId: 'lane-1',
      name: 'Task',
      description: 'Details',
      remindAt: '2026-08-01T10:00:00.000Z',
      status: CARD_STATUS.IN_PROGRESS,
      position: 1,
    })

    expect(builder.insert).toHaveBeenCalledWith({
      lane_id: 'lane-1',
      name: 'Task',
      description: 'Details',
      remind_at: '2026-08-01T10:00:00.000Z',
      status: CARD_STATUS.IN_PROGRESS,
      position: 1,
    })
  })

  it('throws when supabase returns an error', async () => {
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error: new Error('insert failed') }))

    await expect(createCard({ laneId: 'lane-1', name: 'Task', position: 0 })).rejects.toThrow(
      'insert failed',
    )
  })
})

describe('updateCard', () => {
  it('applies arbitrary updates by card id', async () => {
    const updated = { id: '1', name: 'Renamed' }
    const builder = createQueryBuilderMock({ data: updated, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await updateCard('1', { name: 'Renamed' })

    expect(builder.update).toHaveBeenCalledWith({ name: 'Renamed' })
    expect(builder.eq).toHaveBeenCalledWith('id', '1')
    expect(result).toBe(updated)
  })

  it('throws when supabase returns an error', async () => {
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error: new Error('update failed') }))

    await expect(updateCard('1', { name: 'Renamed' })).rejects.toThrow('update failed')
  })
})

describe('deleteCard', () => {
  it('deletes the card by id', async () => {
    const builder = createQueryBuilderMock({ data: null, error: null })
    supabaseMock.from.mockReturnValue(builder)

    await deleteCard('1')

    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', '1')
  })

  it('throws when supabase returns an error', async () => {
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error: new Error('delete failed') }))

    await expect(deleteCard('1')).rejects.toThrow('delete failed')
  })
})

describe('moveCardToLane', () => {
  it('updates lane_id and position without touching status', async () => {
    const moved = { id: '1', lane_id: 'lane-2', position: 3 }
    const builder = createQueryBuilderMock({ data: moved, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await moveCardToLane('1', 'lane-2', 3)

    expect(builder.update).toHaveBeenCalledWith({ lane_id: 'lane-2', position: 3 })
    expect(builder.update.mock.calls[0][0]).not.toHaveProperty('status')
    expect(builder.eq).toHaveBeenCalledWith('id', '1')
    expect(result).toBe(moved)
  })

  it('throws when supabase returns an error', async () => {
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error: new Error('move failed') }))

    await expect(moveCardToLane('1', 'lane-2', 3)).rejects.toThrow('move failed')
  })
})

describe('reorderCard', () => {
  it('updates the card position by id', async () => {
    const updated = { id: '1', position: 5 }
    const builder = createQueryBuilderMock({ data: updated, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await reorderCard('1', 5)

    expect(builder.update).toHaveBeenCalledWith({ position: 5 })
    expect(builder.eq).toHaveBeenCalledWith('id', '1')
    expect(result).toBe(updated)
  })

  it('throws when supabase returns an error', async () => {
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error: new Error('reorder failed') }))

    await expect(reorderCard('1', 5)).rejects.toThrow('reorder failed')
  })
})

describe('setCardStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mockCurrentCardThenUpdate(currentCard, updateResult = { data: {}, error: null }) {
    const readBuilder = createQueryBuilderMock({ data: currentCard, error: null })
    const writeBuilder = createQueryBuilderMock(updateResult)
    supabaseMock.from.mockReturnValueOnce(readBuilder).mockReturnValueOnce(writeBuilder)
    return { readBuilder, writeBuilder }
  }

  it('sets status to TODO without moving lanes when the card was already in a user lane', async () => {
    const updated = { id: '1', status: CARD_STATUS.TODO }
    const { writeBuilder } = mockCurrentCardThenUpdate(
      { id: '1', status: CARD_STATUS.TODO, lane_id: 'user-lane-1', pre_system_lane_id: null },
      { data: updated, error: null },
    )

    const result = await setCardStatus('1', CARD_STATUS.TODO)

    expect(fetchSystemLaneMock).not.toHaveBeenCalled()
    expect(fetchFirstUserLaneMock).not.toHaveBeenCalled()
    expect(writeBuilder.update).toHaveBeenCalledWith({
      status: CARD_STATUS.TODO,
      completed_at: null,
    })
    expect(result).toBe(updated)
  })

  it('sets status to IN_PROGRESS without moving lanes when the card was already in a user lane', async () => {
    const { writeBuilder } = mockCurrentCardThenUpdate({
      id: '1',
      status: CARD_STATUS.IN_PROGRESS,
      lane_id: 'user-lane-1',
      pre_system_lane_id: null,
    })

    await setCardStatus('1', CARD_STATUS.IN_PROGRESS)

    expect(fetchSystemLaneMock).not.toHaveBeenCalled()
    expect(fetchFirstUserLaneMock).not.toHaveBeenCalled()
    expect(writeBuilder.update).toHaveBeenCalledWith({
      status: CARD_STATUS.IN_PROGRESS,
      completed_at: null,
    })
  })

  it('moves the card to the DELAYED system lane, remembers its lane, and leaves completed_at null', async () => {
    fetchSystemLaneMock.mockResolvedValue({ id: 'delayed-lane-id', system_type: 'delayed' })
    const { writeBuilder } = mockCurrentCardThenUpdate({
      id: '1',
      status: CARD_STATUS.TODO,
      lane_id: 'user-lane-1',
      pre_system_lane_id: null,
    })

    await setCardStatus('1', CARD_STATUS.DELAYED)

    expect(fetchSystemLaneMock).toHaveBeenCalledWith('delayed')
    expect(writeBuilder.update).toHaveBeenCalledWith({
      status: CARD_STATUS.DELAYED,
      lane_id: 'delayed-lane-id',
      pre_system_lane_id: 'user-lane-1',
      completed_at: null,
    })
  })

  it('moves the card to the COMPLETED system lane, remembers its lane, and stamps completed_at', async () => {
    fetchSystemLaneMock.mockResolvedValue({ id: 'completed-lane-id', system_type: 'completed' })
    const { writeBuilder } = mockCurrentCardThenUpdate({
      id: '1',
      status: CARD_STATUS.TODO,
      lane_id: 'user-lane-1',
      pre_system_lane_id: null,
    })

    await setCardStatus('1', CARD_STATUS.COMPLETED)

    expect(fetchSystemLaneMock).toHaveBeenCalledWith('completed')
    expect(writeBuilder.update).toHaveBeenCalledWith({
      status: CARD_STATUS.COMPLETED,
      lane_id: 'completed-lane-id',
      pre_system_lane_id: 'user-lane-1',
      completed_at: '2026-08-01T12:00:00.000Z',
    })
  })

  it('going directly from DELAYED to COMPLETED keeps the originally remembered lane', async () => {
    fetchSystemLaneMock.mockResolvedValue({ id: 'completed-lane-id', system_type: 'completed' })
    const { writeBuilder } = mockCurrentCardThenUpdate({
      id: '1',
      status: CARD_STATUS.DELAYED,
      lane_id: 'delayed-lane-id',
      pre_system_lane_id: 'original-user-lane-id',
    })

    await setCardStatus('1', CARD_STATUS.COMPLETED)

    expect(writeBuilder.update).toHaveBeenCalledWith({
      status: CARD_STATUS.COMPLETED,
      lane_id: 'completed-lane-id',
      pre_system_lane_id: 'original-user-lane-id',
      completed_at: '2026-08-01T12:00:00.000Z',
    })
  })

  it('restores the remembered lane and clears pre_system_lane_id when leaving a system lane', async () => {
    const { writeBuilder } = mockCurrentCardThenUpdate({
      id: '1',
      status: CARD_STATUS.COMPLETED,
      lane_id: 'completed-lane-id',
      pre_system_lane_id: 'original-user-lane-id',
    })

    await setCardStatus('1', CARD_STATUS.IN_PROGRESS)

    expect(fetchFirstUserLaneMock).not.toHaveBeenCalled()
    expect(writeBuilder.update).toHaveBeenCalledWith({
      status: CARD_STATUS.IN_PROGRESS,
      lane_id: 'original-user-lane-id',
      pre_system_lane_id: null,
      completed_at: null,
    })
  })

  it('falls back to the first user lane when leaving a system lane with no remembered lane', async () => {
    fetchFirstUserLaneMock.mockResolvedValue({ id: 'fallback-lane-id' })
    const { writeBuilder } = mockCurrentCardThenUpdate({
      id: '1',
      status: CARD_STATUS.DELAYED,
      lane_id: 'delayed-lane-id',
      pre_system_lane_id: null,
    })

    await setCardStatus('1', CARD_STATUS.TODO)

    expect(fetchFirstUserLaneMock).toHaveBeenCalled()
    expect(writeBuilder.update).toHaveBeenCalledWith({
      status: CARD_STATUS.TODO,
      lane_id: 'fallback-lane-id',
      pre_system_lane_id: null,
      completed_at: null,
    })
  })

  it('throws when the system lane lookup fails', async () => {
    fetchSystemLaneMock.mockRejectedValue(new Error('lane not found'))
    mockCurrentCardThenUpdate({
      id: '1',
      status: CARD_STATUS.TODO,
      lane_id: 'user-lane-1',
      pre_system_lane_id: null,
    })

    await expect(setCardStatus('1', CARD_STATUS.COMPLETED)).rejects.toThrow('lane not found')
  })

  it('throws when supabase returns an error on the update', async () => {
    mockCurrentCardThenUpdate(
      { id: '1', status: CARD_STATUS.TODO, lane_id: 'user-lane-1', pre_system_lane_id: null },
      { data: null, error: new Error('update failed') },
    )

    await expect(setCardStatus('1', CARD_STATUS.TODO)).rejects.toThrow('update failed')
  })

  it('throws when the current-card lookup fails', async () => {
    supabaseMock.from.mockReturnValueOnce(createQueryBuilderMock({ data: null, error: new Error('not found') }))

    await expect(setCardStatus('1', CARD_STATUS.TODO)).rejects.toThrow('not found')
  })
})
