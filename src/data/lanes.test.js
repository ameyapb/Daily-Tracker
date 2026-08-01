import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryBuilderMock, createSupabaseMock } from '../test/supabaseMock'

const supabaseMock = createSupabaseMock()

vi.mock('../supabaseClient', () => ({
  supabase: supabaseMock,
}))

const { fetchLanes, createLane, renameLane, reorderLane, deleteLane, fetchSystemLane, fetchFirstUserLane } =
  await import('./lanes')

beforeEach(() => {
  supabaseMock.from.mockReset()
})

describe('fetchLanes', () => {
  it('returns lanes ordered by position', async () => {
    const lanes = [{ id: '1', position: 0 }]
    const builder = createQueryBuilderMock({ data: lanes, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await fetchLanes()

    expect(supabaseMock.from).toHaveBeenCalledWith('lanes')
    expect(builder.order).toHaveBeenCalledWith('position', { ascending: true })
    expect(result).toBe(lanes)
  })

  it('throws when supabase returns an error', async () => {
    const error = new Error('boom')
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error }))

    await expect(fetchLanes()).rejects.toThrow('boom')
  })
})

describe('createLane', () => {
  it('inserts a lane with the given name and position', async () => {
    const created = { id: '1', name: 'Work', position: 0 }
    const builder = createQueryBuilderMock({ data: created, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await createLane({ name: 'Work', position: 0 })

    expect(builder.insert).toHaveBeenCalledWith({ name: 'Work', position: 0 })
    expect(result).toBe(created)
  })

  it('throws when supabase returns an error', async () => {
    const error = new Error('insert failed')
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error }))

    await expect(createLane({ name: 'Work', position: 0 })).rejects.toThrow('insert failed')
  })
})

describe('renameLane', () => {
  it('updates the lane name by id', async () => {
    const updated = { id: '1', name: 'New Name' }
    const builder = createQueryBuilderMock({ data: updated, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await renameLane('1', 'New Name')

    expect(builder.update).toHaveBeenCalledWith({ name: 'New Name' })
    expect(builder.eq).toHaveBeenCalledWith('id', '1')
    expect(result).toBe(updated)
  })

  it('throws when supabase returns an error', async () => {
    const error = new Error('rename failed')
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error }))

    await expect(renameLane('1', 'New Name')).rejects.toThrow('rename failed')
  })
})

describe('reorderLane', () => {
  it('updates the lane position by id', async () => {
    const updated = { id: '1', position: 2 }
    const builder = createQueryBuilderMock({ data: updated, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await reorderLane('1', 2)

    expect(builder.update).toHaveBeenCalledWith({ position: 2 })
    expect(builder.eq).toHaveBeenCalledWith('id', '1')
    expect(result).toBe(updated)
  })

  it('throws when supabase returns an error', async () => {
    const error = new Error('reorder failed')
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error }))

    await expect(reorderLane('1', 2)).rejects.toThrow('reorder failed')
  })
})

describe('deleteLane', () => {
  it('deletes the lane by id', async () => {
    const builder = createQueryBuilderMock({ data: null, error: null })
    supabaseMock.from.mockReturnValue(builder)

    await deleteLane('1')

    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', '1')
  })

  it('throws when supabase returns an error', async () => {
    const error = new Error('delete failed')
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error }))

    await expect(deleteLane('1')).rejects.toThrow('delete failed')
  })
})

describe('fetchSystemLane', () => {
  it('looks up a system lane by system_type rather than a hardcoded id', async () => {
    const systemLane = { id: 'sys-1', system_type: 'delayed' }
    const builder = createQueryBuilderMock({ data: systemLane, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await fetchSystemLane('delayed')

    expect(builder.eq).toHaveBeenCalledWith('system_type', 'delayed')
    expect(result).toBe(systemLane)
  })

  it('throws when supabase returns an error', async () => {
    const error = new Error('not found')
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error }))

    await expect(fetchSystemLane('delayed')).rejects.toThrow('not found')
  })
})

describe('fetchFirstUserLane', () => {
  it('looks up the lowest-position non-system lane', async () => {
    const firstUserLane = { id: 'lane-1', is_system: false, position: 0 }
    const builder = createQueryBuilderMock({ data: firstUserLane, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await fetchFirstUserLane()

    expect(builder.eq).toHaveBeenCalledWith('is_system', false)
    expect(builder.order).toHaveBeenCalledWith('position', { ascending: true })
    expect(builder.limit).toHaveBeenCalledWith(1)
    expect(result).toBe(firstUserLane)
  })

  it('resolves to null when there are no user lanes', async () => {
    const builder = createQueryBuilderMock({ data: null, error: null })
    supabaseMock.from.mockReturnValue(builder)

    const result = await fetchFirstUserLane()

    expect(result).toBeNull()
  })

  it('throws when supabase returns an error', async () => {
    const error = new Error('lookup failed')
    supabaseMock.from.mockReturnValue(createQueryBuilderMock({ data: null, error }))

    await expect(fetchFirstUserLane()).rejects.toThrow('lookup failed')
  })
})
