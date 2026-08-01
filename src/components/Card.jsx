import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CARD_STATUS, STATUS_LABEL } from '../data/constants'
import { CARD_DRAG_TYPE } from './dragTypes'
import './Card.css'

const STATUS_MODIFIER_CLASS = {
  [CARD_STATUS.TODO]: 'card__status--todo',
  [CARD_STATUS.IN_PROGRESS]: 'card__status--in-progress',
  [CARD_STATUS.COMPLETED]: 'card__status--completed',
  [CARD_STATUS.DELAYED]: 'card__status--delayed',
}

function formatReminderTime(remindAt) {
  return new Date(remindAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function Card({ card, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: CARD_DRAG_TYPE, card },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(card)}
      onKeyDown={(event) => event.key === 'Enter' && onOpen(card)}
      {...attributes}
      {...listeners}
    >
      <div className="card__header">
        <span className="card__name">{card.name}</span>
        <span className={`card__status ${STATUS_MODIFIER_CLASS[card.status]}`}>
          {STATUS_LABEL[card.status]}
        </span>
      </div>

      {card.description && <p className="card__description">{card.description}</p>}

      {card.remind_at && <span className="card__reminder">{formatReminderTime(card.remind_at)}</span>}
    </div>
  )
}
