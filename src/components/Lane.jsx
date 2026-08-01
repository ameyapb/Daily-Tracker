import { useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SYSTEM_LANE_TYPE } from '../data/constants'
import { Card } from './Card'
import { LANE_DRAG_TYPE } from './dragTypes'
import {
  LANE_IDLE_SWAY_DURATION_MS,
  LANE_IDLE_SWAY_DELAY_MS,
  ADD_CARD_IDLE_NUDGE_DURATION_MS,
  ADD_CARD_IDLE_NUDGE_DELAY_MS,
} from './meadowConstants'
import { randomTiming } from './meadowUtils'
import './Lane.css'

export function Lane({
  lane,
  cards = [],
  onRename,
  onDelete,
  onOpenCard,
  onCreateCard,
  justCompletedCardId,
  isAnyCardDragging = false,
  justDroppedCardId = null,
}) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(lane.name)
  const [isDeleteArmed, setIsDeleteArmed] = useState(false)

  const isDraggable = !lane.is_system
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lane.id,
    disabled: !isDraggable,
    data: { type: LANE_DRAG_TYPE, lane },
  })

  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: lane.id,
    data: { type: LANE_DRAG_TYPE, lane },
  })

  const idleSwayTiming = useMemo(
    () => randomTiming(LANE_IDLE_SWAY_DURATION_MS, LANE_IDLE_SWAY_DELAY_MS),
    [],
  )

  const addCardNudgeTiming = useMemo(
    () => randomTiming(ADD_CARD_IDLE_NUDGE_DURATION_MS, ADD_CARD_IDLE_NUDGE_DELAY_MS),
    [],
  )

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    '--lane-idle-sway-duration': `${idleSwayTiming.durationMs}ms`,
    '--lane-idle-sway-delay': `${idleSwayTiming.delayMs}ms`,
    '--add-card-idle-nudge-duration': `${addCardNudgeTiming.durationMs}ms`,
    '--add-card-idle-nudge-delay': `${addCardNudgeTiming.delayMs}ms`,
  }

  const isDelayedLane = lane.system_type === SYSTEM_LANE_TYPE.DELAYED

  function startEditingName() {
    if (lane.is_system) return
    setDraftName(lane.name)
    setIsEditingName(true)
  }

  async function commitRename() {
    setIsEditingName(false)
    const trimmedName = draftName.trim()
    if (trimmedName && trimmedName !== lane.name) {
      try {
        await onRename(lane.id, trimmedName)
      } catch {
        // surfaced via Board's mutation-error banner
      }
    }
  }

  function handleNameKeyDown(event) {
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') {
      setDraftName(lane.name)
      setIsEditingName(false)
    }
  }

  function armDelete() {
    setIsDeleteArmed(true)
  }

  function disarmDelete() {
    setIsDeleteArmed(false)
  }

  function handleDeleteClick() {
    if (isDeleteArmed) {
      setIsDeleteArmed(false)
      onDelete(lane.id).catch(() => {})
    } else {
      armDelete()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`lane${isDelayedLane ? ' lane--delayed' : ''}${isDragging ? ' lane--dragging' : ''}`}
    >
      <div className="lane__header">
        {isDraggable && (
          <span
            className="lane__drag-handle"
            aria-label={`Reorder lane ${lane.name}`}
            {...attributes}
            {...listeners}
          >
            ::
          </span>
        )}

        {isEditingName ? (
          <input
            className="lane__name-input"
            value={draftName}
            autoFocus
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={handleNameKeyDown}
          />
        ) : (
          <span className="lane__name" onClick={disarmDelete} onDoubleClick={startEditingName}>
            {lane.name}
          </span>
        )}

        {isDelayedLane && cards.length > 0 && <span className="lane__badge">{cards.length}</span>}

        {!lane.is_system && (
          <button
            type="button"
            className={`lane__delete${isDeleteArmed ? ' lane__delete--armed' : ''}`}
            aria-label={isDeleteArmed ? `Confirm delete lane ${lane.name}` : `Delete lane ${lane.name}`}
            onClick={handleDeleteClick}
            onBlur={disarmDelete}
          >
            {isDeleteArmed ? 'Confirm?' : <>&times;</>}
          </button>
        )}
      </div>

      <div ref={setDroppableNodeRef} className="lane__body">
        <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onOpen={onOpenCard}
              isCelebratingCompletion={card.id === justCompletedCardId}
              isAnyCardDragging={isAnyCardDragging}
              isJustDropped={card.id === justDroppedCardId}
            />
          ))}
        </SortableContext>

        <button type="button" className="lane__add-card" onClick={() => onCreateCard(lane.id)}>
          + Add card
        </button>
      </div>
    </div>
  )
}
