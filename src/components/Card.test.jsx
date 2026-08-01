import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { CARD_STATUS, STATUS_LABEL } from '../data/constants'
import { Card } from './Card'

vi.mock('lottie-react', () => ({
  default: (props) => <div data-testid="lottie-mock" {...props} />,
}))

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

  it('applies the folded-corner modifier class for a completed card', () => {
    renderCard({ ...BASE_CARD, status: CARD_STATUS.COMPLETED })

    expect(screen.getByRole('button')).toHaveClass('card--completed')
  })

  it('does not apply the folded-corner modifier class for a non-completed card', () => {
    renderCard(BASE_CARD)

    expect(screen.getByRole('button')).not.toHaveClass('card--completed')
  })

  it('does not play the completion celebration on initial mount', () => {
    renderCard({ ...BASE_CARD, status: CARD_STATUS.COMPLETED })

    expect(screen.queryByTestId('lottie-mock')).not.toBeInTheDocument()
  })

  it('plays the completion celebration when a card transitions into COMPLETED', () => {
    const { rerender } = render(
      <DndContext>
        <Card card={{ ...BASE_CARD, status: CARD_STATUS.IN_PROGRESS }} onOpen={vi.fn()} />
      </DndContext>,
    )

    rerender(
      <DndContext>
        <Card card={{ ...BASE_CARD, status: CARD_STATUS.COMPLETED }} onOpen={vi.fn()} />
      </DndContext>,
    )

    expect(screen.getByTestId('lottie-mock')).toBeInTheDocument()
  })

  it('does not play the completion celebration for the drag overlay card', () => {
    render(<Card card={{ ...BASE_CARD, status: CARD_STATUS.COMPLETED }} onOpen={vi.fn()} isOverlay />)

    expect(screen.queryByTestId('lottie-mock')).not.toBeInTheDocument()
  })
})
