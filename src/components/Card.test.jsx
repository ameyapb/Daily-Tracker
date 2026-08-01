import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { CARD_STATUS, STATUS_LABEL } from '../data/constants'
import { Card } from './Card'

const BASE_CARD = {
  id: 'card-1',
  lane_id: 'lane-1',
  name: 'Write report',
  description: null,
  remind_at: null,
  status: CARD_STATUS.TODO,
}

function renderCard(card, onOpen = vi.fn()) {
  render(
    <DndContext>
      <Card card={card} onOpen={onOpen} />
    </DndContext>,
  )
  return onOpen
}

describe('Card', () => {
  it('renders the card name and status label', () => {
    renderCard(BASE_CARD)

    expect(screen.getByText('Write report')).toBeInTheDocument()
    expect(screen.getByText(STATUS_LABEL[CARD_STATUS.TODO])).toBeInTheDocument()
  })

  it('renders the description when present', () => {
    renderCard({ ...BASE_CARD, description: 'Quarterly numbers' })

    expect(screen.getByText('Quarterly numbers')).toBeInTheDocument()
  })

  it('does not render a description paragraph when absent', () => {
    renderCard(BASE_CARD)

    expect(screen.queryByText('Quarterly numbers')).not.toBeInTheDocument()
  })

  it('renders a formatted reminder time when remind_at is set', () => {
    renderCard({ ...BASE_CARD, remind_at: '2026-08-01T15:30:00.000Z' })

    expect(screen.getByText(new Date('2026-08-01T15:30:00.000Z').toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }))).toBeInTheDocument()
  })

  it('calls onOpen with the card when clicked', () => {
    const onOpen = renderCard(BASE_CARD)

    fireEvent.click(screen.getByText('Write report'))

    expect(onOpen).toHaveBeenCalledWith(BASE_CARD)
  })

  it('shows the delayed status label for a delayed card', () => {
    renderCard({ ...BASE_CARD, status: CARD_STATUS.DELAYED })

    expect(screen.getByText(STATUS_LABEL[CARD_STATUS.DELAYED])).toBeInTheDocument()
  })
})
