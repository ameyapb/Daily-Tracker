import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SNOOZE_DURATION_MS } from '../data/constants'
import { ReminderModal } from './ReminderModal'

const CARD_ONE = { id: 'card-1', name: 'Write report', description: 'Quarterly numbers' }
const CARD_TWO = { id: 'card-2', name: 'Call plumber', description: null }

describe('ReminderModal', () => {
  it('renders nothing when there are no fired cards', () => {
    const { container } = render(<ReminderModal cards={[]} onSnooze={vi.fn()} onComplete={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders one row per fired card instead of stacking multiple modals', () => {
    render(<ReminderModal cards={[CARD_ONE, CARD_TWO]} onSnooze={vi.fn()} onComplete={vi.fn()} />)

    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
    expect(screen.getByText('Write report')).toBeInTheDocument()
    expect(screen.getByText('Call plumber')).toBeInTheDocument()
  })

  it('calls onSnooze with a fixed duration when a preset button is clicked', () => {
    const onSnooze = vi.fn()
    render(<ReminderModal cards={[CARD_ONE]} onSnooze={onSnooze} onComplete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '15 min' }))

    expect(onSnooze).toHaveBeenCalledWith('card-1', SNOOZE_DURATION_MS.FIFTEEN_MINUTES)
  })

  it('calls onSnooze with a custom duration converted from minutes to ms', () => {
    const onSnooze = vi.fn()
    render(<ReminderModal cards={[CARD_ONE]} onSnooze={onSnooze} onComplete={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Custom snooze minutes for Write report'), {
      target: { value: '45' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Snooze' }))

    expect(onSnooze).toHaveBeenCalledWith('card-1', 45 * 60 * 1000)
  })

  it('does not call onSnooze for a non-positive custom duration', () => {
    const onSnooze = vi.fn()
    render(<ReminderModal cards={[CARD_ONE]} onSnooze={onSnooze} onComplete={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Custom snooze minutes for Write report'), {
      target: { value: '0' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Snooze' }))

    expect(onSnooze).not.toHaveBeenCalled()
  })

  it('calls onComplete with the card id', () => {
    const onComplete = vi.fn()
    render(<ReminderModal cards={[CARD_ONE]} onSnooze={vi.fn()} onComplete={onComplete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }))

    expect(onComplete).toHaveBeenCalledWith('card-1')
  })
})
