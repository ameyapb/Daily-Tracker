import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Lane } from './Lane'

vi.mock('lottie-react', () => ({
  default: (props) => <div data-testid="lottie-mock" {...props} />,
}))

const USER_LANE = { id: 'lane-1', name: 'Today', is_system: false, position: 0 }

function renderLane(overrides = {}) {
  const props = {
    lane: USER_LANE,
    cards: [],
    onRename: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onOpenCard: vi.fn(),
    onCreateCard: vi.fn(),
    onQuickCreateCard: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(<Lane {...props} />)
  return props
}

describe('Lane delete confirmation', () => {
  it('does not call onDelete on the first click, and shows a confirm state', () => {
    const { onDelete } = renderLane()
    const deleteButton = screen.getByRole('button', { name: 'Delete lane Today' })

    fireEvent.click(deleteButton)

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirm delete lane Today' })).toBeInTheDocument()
  })

  it('calls onDelete on a second click within the confirm window', () => {
    const { onDelete } = renderLane()
    fireEvent.click(screen.getByRole('button', { name: 'Delete lane Today' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete lane Today' }))

    expect(onDelete).toHaveBeenCalledWith('lane-1')
  })

  it('disarms when clicking elsewhere in the lane', () => {
    renderLane()
    fireEvent.click(screen.getByRole('button', { name: 'Delete lane Today' }))
    expect(screen.getByRole('button', { name: 'Confirm delete lane Today' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Today'))

    expect(screen.getByRole('button', { name: 'Delete lane Today' })).toBeInTheDocument()
  })
})

describe('Lane completed-lane badge', () => {
  const COMPLETED_LANE = {
    id: 'completed-lane',
    name: 'Completed',
    is_system: true,
    system_type: 'completed',
    position: -2,
  }

  it('shows a count badge on the COMPLETED lane when it has cards', () => {
    renderLane({
      lane: COMPLETED_LANE,
      cards: [
        { id: 'c1', name: 'Done thing', status: 'COMPLETED' },
        { id: 'c2', name: 'Another', status: 'COMPLETED' },
      ],
    })

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows no badge on the COMPLETED lane when it is empty', () => {
    renderLane({ lane: COMPLETED_LANE, cards: [] })

    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})

describe('Lane quick-add', () => {
  it('creates a card on Enter with the typed name, then clears the input', () => {
    const { onQuickCreateCard } = renderLane()
    const input = screen.getByPlaceholderText('Add a card...')

    fireEvent.change(input, { target: { value: 'Buy milk' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onQuickCreateCard).toHaveBeenCalledWith('lane-1', 'Buy milk')
    expect(input).toHaveValue('')
  })

  it('does not create a card on Enter with an empty or whitespace-only name', () => {
    const { onQuickCreateCard } = renderLane()
    const input = screen.getByPlaceholderText('Add a card...')

    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onQuickCreateCard).not.toHaveBeenCalled()
  })

  it('opens the full modal via the more-options control', () => {
    const { onCreateCard } = renderLane()

    fireEvent.click(screen.getByRole('button', { name: 'More options for new card' }))

    expect(onCreateCard).toHaveBeenCalledWith('lane-1')
  })
})
