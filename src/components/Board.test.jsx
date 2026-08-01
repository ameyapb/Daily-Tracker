import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Board } from './Board'

vi.mock('lottie-react', () => ({
  default: (props) => <div data-testid="lottie-mock" {...props} />,
}))

vi.mock('../hooks/useLanes', () => ({
  useLanes: () => ({
    lanes: [{ id: 'lane-1', name: 'Today', is_system: false, position: 0 }],
    isLoading: false,
    error: null,
    mutationError: null,
    clearMutationError: vi.fn(),
    createLane: vi.fn(),
    renameLane: vi.fn(),
    deleteLane: vi.fn(),
    reorderUserLanes: vi.fn(),
  }),
}))

vi.mock('../hooks/useCards', () => ({
  useCards: () => ({
    cards: [],
    isLoading: false,
    error: null,
    mutationError: null,
    clearMutationError: vi.fn(),
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    moveCardToLane: vi.fn(),
    reorderCardsInLane: vi.fn(),
    setCardStatus: vi.fn(),
    moveCardOutOfSystemLane: vi.fn(),
    justCompletedCardId: null,
  }),
}))

vi.mock('../hooks/useStatusAutomation', () => ({ useStatusAutomation: vi.fn() }))
vi.mock('../hooks/useDailyCompletedReset', () => ({ useDailyCompletedReset: vi.fn() }))
vi.mock('../hooks/useReminderQueue', () => ({
  useReminderQueue: () => ({ firedCards: [], snoozeCard: vi.fn(), dismissCard: vi.fn() }),
}))

describe('Board keyboard drag support', () => {
  it('makes the lane drag handle keyboard-operable', () => {
    render(<Board />)

    const dragHandle = screen.getByLabelText('Reorder lane Today')
    expect(dragHandle).toHaveAttribute('tabindex', '0')
    expect(dragHandle).toHaveAttribute('role', 'button')
  })
})
