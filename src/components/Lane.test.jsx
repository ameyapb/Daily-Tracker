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
