import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CARD_STATUS } from '../data/constants'
import { CardModal } from './CardModal'

const EXISTING_CARD = {
  id: 'card-1',
  lane_id: 'lane-1',
  name: 'Write report',
  description: 'Quarterly numbers',
  remind_at: null,
  status: CARD_STATUS.TODO,
}

describe('CardModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requires a name before saving on create', () => {
    const onSave = vi.fn()
    render(<CardModal card={null} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves a new card with no reminder by default', () => {
    const onSave = vi.fn()
    render(<CardModal card={null} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Task name'), { target: { value: 'New task' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith({
      name: 'New task',
      description: null,
      remindAt: null,
      status: CARD_STATUS.TODO,
    })
  })

  it('computes an absolute remind_at from a picked local time', () => {
    const onSave = vi.fn()
    render(<CardModal card={null} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Task name'), { target: { value: 'Deadline task' } })
    fireEvent.click(screen.getByLabelText('At a specific time'))
    const dateInput = document.querySelector('input[type="datetime-local"]')
    fireEvent.change(dateInput, { target: { value: '2026-08-05T09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        remindAt: new Date('2026-08-05T09:00').toISOString(),
      }),
    )
  })

  it('computes a relative remind_at offset from now', () => {
    const onSave = vi.fn()
    render(<CardModal card={null} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Task name'), { target: { value: 'Relative task' } })
    fireEvent.click(screen.getByLabelText('After a delay'))
    const amountInput = document.querySelector('input[type="number"]')
    fireEvent.change(amountInput, { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const expected = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ remindAt: expected }))
  })

  it('prefills fields from an existing card when editing', () => {
    render(<CardModal card={EXISTING_CARD} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByDisplayValue('Write report')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Quarterly numbers')).toBeInTheDocument()
  })

  it('shows a delete button only when editing', () => {
    const { rerender } = render(
      <CardModal card={EXISTING_CARD} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()

    rerender(<CardModal card={null} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('requires a second click to confirm delete', () => {
    const onDelete = vi.fn()
    render(<CardModal card={EXISTING_CARD} onSave={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(onDelete).toHaveBeenCalledWith('card-1')
  })

  it('calls onClose when clicking the overlay but not when clicking inside the modal', () => {
    const onClose = vi.fn()
    const { container } = render(
      <CardModal card={EXISTING_CARD} onSave={vi.fn()} onDelete={vi.fn()} onClose={onClose} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(container.querySelector('.card-modal-overlay'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<CardModal card={EXISTING_CARD} onSave={vi.fn()} onDelete={vi.fn()} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('sets a min on the absolute reminder input equal to the current time', () => {
    render(<CardModal card={null} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('At a specific time'))
    const dateInput = document.querySelector('input[type="datetime-local"]')

    const now = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    const expectedMin = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

    expect(dateInput).toHaveAttribute('min', expectedMin)
  })
})
