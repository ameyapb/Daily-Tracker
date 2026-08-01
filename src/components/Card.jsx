import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import Lottie from 'lottie-react'
import { CARD_STATUS, STATUS_LABEL } from '../data/constants'
import { CARD_DRAG_TYPE } from './dragTypes'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import rabbitInAHatAnimation from '../assets/lottie/rabbit-in-a-hat.json'
import {
  LAYOUT_REFLOW_TRANSITION,
  CARD_DROP_SETTLE_TRANSITION,
  REDUCED_MOTION_LAYOUT_TRANSITION,
} from './meadowConstants'
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

export function Card({
  card,
  onOpen,
  isOverlay = false,
  isCelebratingCompletion = false,
  isAnyCardDragging = false,
  isJustDropped = false,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: CARD_DRAG_TYPE, card },
    disabled: isOverlay,
  })

  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        visibility: isDragging ? 'hidden' : 'visible',
      }

  const isCompleted = card.status === CARD_STATUS.COMPLETED
  const prefersReducedMotion = usePrefersReducedMotion()
  const isCelebrating = isCelebratingCompletion && !isOverlay && !prefersReducedMotion

  const layoutTransition = prefersReducedMotion
    ? REDUCED_MOTION_LAYOUT_TRANSITION
    : isJustDropped
      ? CARD_DROP_SETTLE_TRANSITION
      : LAYOUT_REFLOW_TRANSITION

  return (
    <motion.div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      layout={!isOverlay && !isDragging && !isAnyCardDragging}
      transition={layoutTransition}
      className={`card${isCompleted ? ' card--completed' : ''}${isOverlay ? ' card--overlay' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(card)}
      onKeyDown={(event) => event.key === 'Enter' && onOpen(card)}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
    >
      <div className="card__header">
        <span className="card__name">{card.name}</span>
        <span className={`card__status ${STATUS_MODIFIER_CLASS[card.status]}`}>
          {STATUS_LABEL[card.status]}
        </span>
      </div>

      {card.description && <p className="card__description">{card.description}</p>}

      {card.remind_at && <span className="card__reminder">{formatReminderTime(card.remind_at)}</span>}

      {isCelebrating && (
        <Lottie
          className="card__celebration"
          animationData={rabbitInAHatAnimation}
          loop={false}
          autoplay
          aria-hidden="true"
        />
      )}
    </motion.div>
  )
}
