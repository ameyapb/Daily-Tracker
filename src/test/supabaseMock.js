import { vi } from 'vitest'

// All data/*.js modules call the same chainable query-builder shape
// (from().select()/.insert()/.update()/.delete()...eq()...order()...single()).
// This factory builds one mock chain shared across data-layer tests instead
// of each test file re-implementing the chain.
export function createQueryBuilderMock(result) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
  }
  return builder
}

export function createSupabaseMock() {
  return {
    from: vi.fn(),
  }
}
