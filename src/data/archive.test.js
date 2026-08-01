import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryBuilderMock, createSupabaseMock } from '../test/supabaseMock'

const supabaseMock = createSupabaseMock()

vi.mock('../supabaseClient', () => ({
  supabase: supabaseMock,
}))

const { archiveCard, isFromPreviousLocalDay } = await import('./archive')

beforeEach(() => {
  supabaseMock.from.mockReset()
})

describe('archiveCard', () => {
  it('inserts a snapshot of the card fields keyed by original_card_id', async () => {
    const card = {
      id: 'card-1',
      lane_id: 'lane-1',
      name: 'Task',
      description: 'Details',
      remind_at: '2026-08-01T09:00:00.000Z',
      status: 'COMPLETED',
      position: 2,
      created_at: '2026-07-30T00:00:00.000Z',
      completed_at: '2026-08-01T10:00:00.000Z',
    }
    const archived = { id: 'archive-1', original_card_id: 'card-1' }
    const builder = createQueryBuilderMock({ data: archived, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await archiveCard(card)

    expect(supabaseMock.from).toHaveBeenCalledWith('cards_archive')
    expect(builder.insert).toHaveBeenCalledWith({
      original_card_id: 'card-1',
      lane_id: 'lane-1',
      name: 'Task',
      description: 'Details',
      remind_at: '2026-08-01T09:00:00.000Z',
      status: 'COMPLETED',
      position: 2,
      created_at: '2026-07-30T00:00:00.000Z',
      completed_at: '2026-08-01T10:00:00.000Z',
    })
    expect(result).toBe(archived)
  })

  it('throws when supabase returns an error', async () => {
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error: new Error('insert failed') }))

    await expect(
      archiveCard({
        id: 'card-1',
        lane_id: 'lane-1',
        name: 'Task',
        description: null,
        remind_at: null,
        status: 'COMPLETED',
        position: 0,
        created_at: '2026-07-30T00:00:00.000Z',
        completed_at: '2026-08-01T10:00:00.000Z',
      }),
    ).rejects.toThrow('insert failed')
  })
})

describe('isFromPreviousLocalDay', () => {
  const now = new Date('2026-08-01T12:00:00.000Z')

  it('returns false for a timestamp earlier today', () => {
    expect(isFromPreviousLocalDay('2026-08-01T00:00:00.000Z', now)).toBe(false)
  })

  it('returns true for a timestamp from yesterday', () => {
    expect(isFromPreviousLocalDay('2026-07-31T12:00:00.000Z', now)).toBe(true)
  })

  it('returns true for a timestamp from a different month', () => {
    expect(isFromPreviousLocalDay('2026-07-01T12:00:00.000Z', now)).toBe(true)
  })
})
