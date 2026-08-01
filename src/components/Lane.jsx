import { useEffect, useMemo, useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { QUICK_ADD_FOCUS_SHORTCUT_KEY, SYSTEM_LANE_TYPE } from '../data/constants'
import { useArmedAction } from '../hooks/useArmedAction'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { Card } from './Card'
import { LANE_DRAG_TYPE } from './dragTypes'
import {
  LANE_IDLE_SWAY_DURATION_MS,
  LANE_IDLE_SWAY_DELAY_MS,
  ADD_CARD_IDLE_NUDGE_DURATION_MS,
  ADD_CARD_IDLE_NUDGE_DELAY_MS,
  LAYOUT_REFLOW_TRANSITION,
  REDUCED_MOTION_LAYOUT_TRANSITION,
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
  onQuickCreateCard,
  justCompletedCardId,
  isAnyCardDragging = false,
  justDroppedCardId = null,
  isAnyLaneDragging = false,
  isOverlay = false,
}) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(lane.name)
  const [quickAddName, setQuickAddName] = useState('')
  const [isHovered, setIsHovered] = useState(false)
  const quickAddInputRef = useRef(null)
  const { isArmed: isDeleteArmed, disarm: disarmDelete, trigger: triggerDelete } = useArmedAction()

  const isDraggable = !lane.is_system
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lane.id,
    disabled: !isDraggable || isOverlay,
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

  const prefersReducedMotion = usePrefersReducedMotion()
  const layoutTransition = prefersReducedMotion ? REDUCED_MOTION_LAYOUT_TRANSITION : LAYOUT_REFLOW_TRANSITION

  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        visibility: isDragging ? 'hidden' : 'visible',
        '--lane-idle-sway-duration': `${idleSwayTiming.durationMs}ms`,
        '--lane-idle-sway-delay': `${idleSwayTiming.delayMs}ms`,
        '--add-card-idle-nudge-duration': `${addCardNudgeTiming.durationMs}ms`,
        '--add-card-idle-nudge-delay': `${addCardNudgeTiming.delayMs}ms`,
      }

  const isDelayedLane = lane.system_type === SYSTEM_LANE_TYPE.DELAYED
  const isCompletedLane = lane.system_type === SYSTEM_LANE_TYPE.COMPLETED

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

  function handleDeleteClick() {
    if (triggerDelete()) {
      onDelete(lane.id).catch(() => {})
    }
  }

  function handleQuickAddKeyDown(event) {
    if (event.key !== 'Enter') return
    const trimmedName = quickAddName.trim()
    if (!trimmedName) return
    onQuickCreateCard(lane.id, trimmedName)
    setQuickAddName('')
  }

  useEffect(() => {
    function handleShortcutKeyDown(event) {
      if (!isHovered) return
      if (event.key !== QUICK_ADD_FOCUS_SHORTCUT_KEY) return
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return
      event.preventDefault()
      quickAddInputRef.current?.focus()
    }
    document.addEventListener('keydown', handleShortcutKeyDown)
    return () => document.removeEventListener('keydown', handleShortcutKeyDown)
  }, [isHovered])

  return (
    <motion.div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      layout={!isOverlay && !isDragging && !isAnyLaneDragging}
      transition={layoutTransition}
      className={`lane${isDelayedLane ? ' lane--delayed' : ''}${isCompletedLane ? ' lane--completed' : ''}${isDragging ? ' lane--dragging' : ''}${isAnyLaneDragging ? ' lane--sway-paused' : ''}${isOverlay ? ' lane--overlay' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="lane__header">
        {isDraggable && (
          <span
            className="lane__drag-handle"
            aria-label={`Reorder lane ${lane.name}`}
            {...(isOverlay ? {} : attributes)}
            {...(isOverlay ? {} : listeners)}
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

        {(isDelayedLane || isCompletedLane) && cards.length > 0 && (
          <span className={`lane__badge${isCompletedLane ? ' lane__badge--completed' : ''}`}>
            {cards.length}
          </span>
        )}

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

        <div className="lane__quick-add">
          <input
            ref={quickAddInputRef}
            className="lane__quick-add-input"
            value={quickAddName}
            onChange={(event) => setQuickAddName(event.target.value)}
            onKeyDown={handleQuickAddKeyDown}
            placeholder="Add a card..."
            aria-label={`Quick-add a card to ${lane.name}`}
          />
          <button
            type="button"
            className="lane__quick-add-more"
            aria-label="More options for new card"
            onClick={() => onCreateCard(lane.id)}
          >
            more options...
          </button>
        </div>
      </div>
    </motion.div>
  )
}
