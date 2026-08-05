import { useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  MeasuringStrategy,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useLanes } from '../hooks/useLanes'
import { useCards } from '../hooks/useCards'
import { useStatusAutomation } from '../hooks/useStatusAutomation'
import { useDailyCompletedReset } from '../hooks/useDailyCompletedReset'
import { useReminderQueue } from '../hooks/useReminderQueue'
import { CARD_STATUS, SYSTEM_LANE_TYPE_TO_STATUS } from '../data/constants'
import { Lane } from './Lane'
import { Card } from './Card'
import { CardModal } from './CardModal'
import { ReminderModal } from './ReminderModal'
import { Header } from './Header'
import { Meadow } from './Meadow'
import { MEADOW_STRIP_HEIGHT_PX, CARD_DROP_SETTLE_FLAG_DURATION_MS } from './meadowConstants'
import { HEADER_HEIGHT_PX } from './headerConstants'
import { LANE_DRAG_TYPE, CARD_DRAG_TYPE } from './dragTypes'
import './Board.css'

// Resolves an absolute order from the lanes' persisted positions rather than
// stepping the previous live order. dnd-kit fires onDragOver repeatedly for the
// same target, so applying arrayMove to the previous result compounded: one
// hovered neighbour walked the lane several slots across the board.
export function computeLiveLaneOrder(activeId, overId, userLaneIds, previousOrder) {
  const identityOrder = userLaneIds
  const baseOrder = previousOrder ?? identityOrder
  if (!overId || overId === activeId) return baseOrder

  const oldIndex = identityOrder.indexOf(activeId)
  const newIndex = identityOrder.indexOf(overId)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return baseOrder

  const nextOrder = arrayMove(identityOrder, oldIndex, newIndex)

  const isUnchanged =
    baseOrder.length === nextOrder.length && baseOrder.every((id, index) => id === nextOrder[index])
  return isUnchanged ? baseOrder : nextOrder
}

function boardScrollLeft() {
  return document.querySelector('.board')?.scrollLeft ?? 0
}

// Lane slots measured once when the drag begins. Live reflow physically moves
// lanes mid-drag, so any decision made against their current rects feeds back
// into itself: the lane the cursor "is over" shifts because of the reorder that
// same reading just caused, and the order oscillates or overshoots. These
// boundaries are captured before the first reflow and never move, which makes
// the target purely a function of where the cursor is.
export function measureLaneSlots(laneIds, scrollLeft = 0) {
  return laneIds
    .map((laneId) => {
      const element = document.querySelector(`[data-lane-slot-id="${laneId}"]`)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      // Stored in board content coordinates, not viewport ones: dragging near
      // an edge auto-scrolls the board, which would otherwise slide every
      // frozen slot out from under the pointer and fling the lane to the end.
      const center = rect.left + rect.width / 2 + scrollLeft
      return { laneId, center }
    })
    .filter(Boolean)
    .sort((a, b) => a.center - b.center)
}

// Which stable slot the cursor currently sits over. Nearest centre rather than
// strict containment so the gaps between lanes still resolve to a target.
export function laneSlotAtCenter(slots, centerX) {
  if (!slots.length) return null

  let closestSlot = slots[0]
  let smallestDistance = Math.abs(centerX - closestSlot.center)
  for (const slot of slots) {
    const distance = Math.abs(centerX - slot.center)
    if (distance < smallestDistance) {
      smallestDistance = distance
      closestSlot = slot
    }
  }
  return closestSlot.laneId
}

function handleLaneDragEnd(active, over, lanes, reorderUserLanes) {
  const userLanes = lanes.filter((lane) => !lane.is_system)
  const oldIndex = userLanes.findIndex((lane) => lane.id === active.id)
  const newIndex = userLanes.findIndex((lane) => lane.id === over.id)
  if (oldIndex === -1 || newIndex === -1) return

  const reordered = arrayMove(userLanes, oldIndex, newIndex)
  reorderUserLanes(reordered.map((lane) => lane.id))
}

function targetLaneIdFor(over) {
  if (over.data.current?.type === LANE_DRAG_TYPE) return over.id
  if (over.data.current?.type === CARD_DRAG_TYPE) return over.data.current.card.lane_id
  return null
}

export function computeLiveCardOrder(active, over, cards, lanes, previousLiveCardOrder) {
  if (!over) return null

  const draggedCard = active.data.current.card

  // Once live reflow has moved the dragged card into the target lane, collision
  // detection resolves `over` to the card's own node. Its data payload still
  // carries the lane_id captured at drag start, so deriving a target lane from it
  // would name the source lane and throw the live order away - which the next
  // event immediately rebuilt, flickering the card between both lanes. Hovering
  // yourself expresses no new intent, so the established order simply stands.
  const isOverDraggedCardItself = over.id === draggedCard.id
  if (isOverDraggedCardItself && previousLiveCardOrder) return previousLiveCardOrder

  const targetLaneId = targetLaneIdFor(over)
  if (!targetLaneId) return null

  const targetLane = lanes.find((lane) => lane.id === targetLaneId)
  if (!targetLane) return null

  const isEnteringSystemLaneAsStatusChange =
    targetLane.is_system && draggedCard.lane_id !== targetLaneId
  if (isEnteringSystemLaneAsStatusChange) return null

  const allCardsInTargetLane = cards.filter((card) => card.lane_id === targetLaneId)
  const cardsInTargetLane = allCardsInTargetLane.filter((card) => card.id !== draggedCard.id)

  let cardIds
  if (over.data.current?.type === CARD_DRAG_TYPE && !isOverDraggedCardItself) {
    const overIndex = cardsInTargetLane.findIndex((card) => card.id === over.id)
    const isMovingWithinSameLane = draggedCard.lane_id === targetLaneId
    const insertAt = overIndex === -1 ? cardsInTargetLane.length : isMovingWithinSameLane ? overIndex + 1 : overIndex
    cardIds = [
      ...cardsInTargetLane.slice(0, insertAt).map((card) => card.id),
      draggedCard.id,
      ...cardsInTargetLane.slice(insertAt).map((card) => card.id),
    ]
  } else if (isOverDraggedCardItself) {
    // Reached only before any reflow has happened, so the card is still where it
    // started and the lane's own order is already correct.
    cardIds = allCardsInTargetLane.map((card) => card.id)
  } else {
    cardIds = [...cardsInTargetLane.map((card) => card.id), draggedCard.id]
  }

  if (
    previousLiveCardOrder?.laneId === targetLaneId &&
    previousLiveCardOrder.cardIds.length === cardIds.length &&
    previousLiveCardOrder.cardIds.every((id, index) => id === cardIds[index])
  ) {
    return previousLiveCardOrder
  }

  return { laneId: targetLaneId, cardIds }
}

const DRAG_MEASURING_CONFIGURATION = {
  droppable: { strategy: MeasuringStrategy.BeforeDragging },
}

function handleCardDragEnd(
  active,
  over,
  cards,
  lanes,
  moveCardToLane,
  setCardStatus,
  moveCardOutOfSystemLane,
  reorderCardsInLane,
  liveCardOrder,
) {
  const draggedCard = active.data.current.card

  // The live reflow already resolved where the card belongs, so it is the source
  // of truth on drop. `over` can resolve to the dragged card's own hidden node
  // once reflow has moved it under the cursor, which says nothing about intent.
  const targetLaneId = liveCardOrder?.laneId ?? targetLaneIdFor(over)
  if (!targetLaneId) return

  if (draggedCard.lane_id !== targetLaneId) {
    const sourceLane = lanes.find((lane) => lane.id === draggedCard.lane_id)
    const targetLane = lanes.find((lane) => lane.id === targetLaneId)
    const targetStatus = targetLane?.is_system ? SYSTEM_LANE_TYPE_TO_STATUS[targetLane.system_type] : null

    // A live-reflowed cross-lane drop knows the exact slot the card landed in,
    // which the lane-move mutators cannot express on their own (they append).
    const applyReflowedOrder = () =>
      liveCardOrder ? reorderCardsInLane(targetLaneId, liveCardOrder.cardIds) : undefined

    if (targetStatus && draggedCard.status !== targetStatus) {
      setCardStatus(draggedCard.id, targetStatus)
    } else if (sourceLane?.is_system) {
      moveCardOutOfSystemLane(draggedCard.id, targetLaneId).then(applyReflowedOrder).catch(() => {})
    } else {
      moveCardToLane(draggedCard.id, targetLaneId).then(applyReflowedOrder).catch(() => {})
    }
    return
  }

  if (liveCardOrder) {
    reorderCardsInLane(targetLaneId, liveCardOrder.cardIds)
    return
  }

  if (!over || active.id === over.id || over.data.current?.type !== CARD_DRAG_TYPE) return

  const cardsInLane = cards.filter((card) => card.lane_id === targetLaneId)
  const oldIndex = cardsInLane.findIndex((card) => card.id === active.id)
  const newIndex = cardsInLane.findIndex((card) => card.id === over.id)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

  const reordered = arrayMove(cardsInLane, oldIndex, newIndex)
  reorderCardsInLane(targetLaneId, reordered.map((card) => card.id))
}

export function Board() {
  const {
    lanes,
    isLoading: isLoadingLanes,
    error: lanesError,
    mutationError: lanesMutationError,
    clearMutationError: clearLanesMutationError,
    createLane,
    renameLane,
    deleteLane,
    reorderUserLanes,
  } = useLanes()
  const {
    cards,
    isLoading: isLoadingCards,
    error: cardsError,
    mutationError: cardsMutationError,
    clearMutationError: clearCardsMutationError,
    createCard,
    updateCard,
    deleteCard,
    moveCardToLane,
    reorderCardsInLane,
    setCardStatus,
    moveCardOutOfSystemLane,
    justCompletedCardId,
  } = useCards()
  const mutationError = lanesMutationError ?? cardsMutationError

  function dismissMutationError() {
    clearLanesMutationError()
    clearCardsMutationError()
  }
  const [newLaneName, setNewLaneName] = useState('')
  const [cardModalState, setCardModalState] = useState(null)
  const [activeDragCard, setActiveDragCard] = useState(null)
  const [justDroppedCardId, setJustDroppedCardId] = useState(null)
  const [activeDragLane, setActiveDragLane] = useState(null)
  const [liveLaneOrder, setLiveLaneOrder] = useState(null)
  const [liveCardOrder, setLiveCardOrder] = useState(null)
  const laneSlotsRef = useRef([])
  const laneGrabOffsetRef = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useStatusAutomation(cards, setCardStatus)
  useDailyCompletedReset(lanes, cards, deleteCard)
  const { firedCards, snoozeCard, dismissCard } = useReminderQueue(cards, updateCard)

  async function handleCompleteReminder(cardId) {
    dismissCard(cardId)
    try {
      await setCardStatus(cardId, CARD_STATUS.COMPLETED)
    } catch {
      // surfaced via cardsMutationError banner
    }
  }

  async function handleCreateLane(event) {
    event.preventDefault()
    const trimmedName = newLaneName.trim()
    if (!trimmedName) return
    try {
      await createLane(trimmedName)
      setNewLaneName('')
    } catch {
      // surfaced via lanesMutationError banner
    }
  }

  function handleDragStart(event) {
    const { active } = event
    if (active.data.current?.type === CARD_DRAG_TYPE) {
      setActiveDragCard(active.data.current.card)
    }
    if (active.data.current?.type === LANE_DRAG_TYPE) {
      setActiveDragLane(active.data.current.lane)
      const slots = measureLaneSlots(
        lanes.filter((lane) => !lane.is_system).map((lane) => lane.id),
        boardScrollLeft(),
      )
      laneSlotsRef.current = slots

      // The drag handle sits at a lane's left edge, so the cursor is offset far
      // from the lane's centre. Tracking that offset lets the reorder follow
      // where the lane actually is instead of where the fingertip is.
      const grabbedSlot = slots.find((slot) => slot.laneId === active.id)
      const pointerXAtStart = event.activatorEvent?.clientX
      laneGrabOffsetRef.current =
        grabbedSlot && pointerXAtStart !== undefined
          ? grabbedSlot.center - (pointerXAtStart + boardScrollLeft())
          : 0
    }
  }

  // Lanes reflow on pointer movement rather than on dnd-kit's `over`, which is
  // driven by droppable rects that live reflow keeps moving out from under it.
  function handleDragMove(event) {
    const { active, activatorEvent, delta } = event
    if (active.data.current?.type !== LANE_DRAG_TYPE) return

    const laneCenterX =
      (activatorEvent?.clientX ?? 0) + (delta?.x ?? 0) + laneGrabOffsetRef.current + boardScrollLeft()
    const overLaneId = laneSlotAtCenter(laneSlotsRef.current, laneCenterX)

    // Indexed against the on-screen slot order, not the lanes' persisted
    // `position` order. The two diverge as soon as a reorder has happened, and
    // resolving the target in the wrong one lands the lane in the wrong slot.
    const visualLaneIds = laneSlotsRef.current.map((slot) => slot.laneId)
    setLiveLaneOrder((currentOrder) =>
      computeLiveLaneOrder(active.id, overLaneId, visualLaneIds, currentOrder),
    )
  }

  function handleDragOver(event) {
    const { active, over } = event

    if (active.data.current?.type === LANE_DRAG_TYPE) return

    if (active.data.current?.type === CARD_DRAG_TYPE) {
      setLiveCardOrder((currentOrder) => computeLiveCardOrder(active, over, cards, lanes, currentOrder))
    }
  }

  function flagCardAsJustDropped(cardId) {
    setJustDroppedCardId(cardId)
    setTimeout(() => {
      setJustDroppedCardId((currentId) => (currentId === cardId ? null : currentId))
    }, CARD_DROP_SETTLE_FLAG_DURATION_MS)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveDragCard(null)
    setActiveDragLane(null)
    laneSlotsRef.current = []
    laneGrabOffsetRef.current = 0
    const finalLiveLaneOrder = liveLaneOrder
    const finalLiveCardOrder = liveCardOrder
    setLiveLaneOrder(null)
    setLiveCardOrder(null)

    if (active.data.current?.type === CARD_DRAG_TYPE) {
      flagCardAsJustDropped(active.id)
    }

    if (active.data.current?.type === LANE_DRAG_TYPE) {
      if (finalLiveLaneOrder) {
        reorderUserLanes(finalLiveLaneOrder)
      } else if (over && active.id !== over.id) {
        handleLaneDragEnd(active, over, lanes, reorderUserLanes)
      }
      return
    }

    if (active.data.current?.type === CARD_DRAG_TYPE) {
      handleCardDragEnd(
        active,
        over,
        cards,
        lanes,
        moveCardToLane,
        setCardStatus,
        moveCardOutOfSystemLane,
        reorderCardsInLane,
        finalLiveCardOrder,
      )
    }
  }

  function handleDragCancel() {
    setActiveDragCard(null)
    setActiveDragLane(null)
    laneSlotsRef.current = []
    laneGrabOffsetRef.current = 0
    setLiveLaneOrder(null)
    setLiveCardOrder(null)
  }

  function openCreateCardModal(laneId) {
    setCardModalState({ laneId })
  }

  async function handleQuickCreateCard(laneId, name) {
    try {
      await createCard(laneId, { name, description: null, remindAt: null, status: CARD_STATUS.TODO })
    } catch {
      // surfaced via cardsMutationError banner
    }
  }

  function openEditCardModal(card) {
    setCardModalState({ laneId: card.lane_id, card })
  }

  function closeCardModal() {
    setCardModalState(null)
  }

  async function handleSaveCard(cardFields) {
    try {
      if (cardModalState.card) {
        await updateCard(cardModalState.card.id, {
          name: cardFields.name,
          description: cardFields.description,
          remind_at: cardFields.remindAt,
          status: cardFields.status,
        })
      } else {
        await createCard(cardModalState.laneId, cardFields)
      }
      closeCardModal()
    } catch {
      // surfaced via cardsMutationError banner; keep modal open so edits aren't lost
    }
  }

  async function handleDeleteCard(cardId) {
    try {
      await deleteCard(cardId)
      closeCardModal()
    } catch {
      // surfaced via cardsMutationError banner; keep modal open so edits aren't lost
    }
  }

  if (isLoadingLanes || isLoadingCards) return <div className="board-status">Loading board...</div>
  if (lanesError) return <div className="board-status board-status--error">{lanesError.message}</div>
  if (cardsError) return <div className="board-status board-status--error">{cardsError.message}</div>

  const realUserLanes = lanes.filter((lane) => !lane.is_system)
  const userLanes = liveLaneOrder
    ? liveLaneOrder.map((laneId) => realUserLanes.find((lane) => lane.id === laneId)).filter(Boolean)
    : realUserLanes
  const systemLanes = lanes.filter((lane) => lane.is_system)

  function cardsByLaneId(laneId) {
    const realCardsInLane = cards.filter((card) => card.lane_id === laneId)

    if (!liveCardOrder) return realCardsInLane

    if (liveCardOrder.laneId === laneId) {
      const cardsById = new Map(cards.map((card) => [card.id, card]))
      return liveCardOrder.cardIds.map((cardId) => cardsById.get(cardId)).filter(Boolean)
    }

    const draggedCardId = activeDragCard?.id
    if (draggedCardId) {
      return realCardsInLane.filter((card) => card.id !== draggedCardId)
    }

    return realCardsInLane
  }

  return (
    <>
      <Header />
      <div
        className={`board${activeDragLane || activeDragCard ? ' board--dragging' : ''}`}
        style={{
          '--meadow-height-px': `${MEADOW_STRIP_HEIGHT_PX}px`,
          '--header-height-px': `${HEADER_HEIGHT_PX}px`,
        }}
      >
        {mutationError && (
          <div className="board__mutation-error" role="alert">
            <span>{mutationError.message}</span>
            <button type="button" onClick={dismissMutationError} aria-label="Dismiss error">
              &times;
            </button>
          </div>
        )}

        {userLanes.length === 0 && (
          <div className="board__empty-state">
            Add your first lane below to start tracking today's tasks.
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={DRAG_MEASURING_CONFIGURATION}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={userLanes.map((lane) => lane.id)}
            strategy={horizontalListSortingStrategy}
          >
            {userLanes.map((lane) => (
              <Lane
                key={lane.id}
                lane={lane}
                cards={cardsByLaneId(lane.id)}
                onRename={renameLane}
                onDelete={deleteLane}
                onOpenCard={openEditCardModal}
                onCreateCard={openCreateCardModal}
                onQuickCreateCard={handleQuickCreateCard}
                justCompletedCardId={justCompletedCardId}
                justDroppedCardId={justDroppedCardId}
                isAnyLaneDragging={activeDragLane !== null}
              />
            ))}
          </SortableContext>

          {systemLanes.map((lane) => (
            <Lane
              key={lane.id}
              lane={lane}
              cards={cardsByLaneId(lane.id)}
              onRename={renameLane}
              onDelete={deleteLane}
              onOpenCard={openEditCardModal}
              onCreateCard={openCreateCardModal}
              onQuickCreateCard={handleQuickCreateCard}
              justCompletedCardId={justCompletedCardId}
              justDroppedCardId={justDroppedCardId}
              isAnyLaneDragging={activeDragLane !== null}
            />
          ))}

          <DragOverlay>
            {activeDragCard && <Card card={activeDragCard} onOpen={() => {}} isOverlay />}
            {activeDragLane && (
              <Lane
                lane={activeDragLane}
                cards={cardsByLaneId(activeDragLane.id)}
                onRename={renameLane}
                onDelete={deleteLane}
                onOpenCard={openEditCardModal}
                onCreateCard={openCreateCardModal}
                onQuickCreateCard={handleQuickCreateCard}
                justCompletedCardId={justCompletedCardId}
                isOverlay
              />
            )}
          </DragOverlay>
        </DndContext>

        <form className="board__add-lane" onSubmit={handleCreateLane}>
          <input
            className="board__add-lane-input"
            value={newLaneName}
            onChange={(event) => setNewLaneName(event.target.value)}
            placeholder="New lane name"
            aria-label="New lane name"
          />
          <button type="submit" className="board__add-lane-button button--lift">
            Add lane
          </button>
        </form>

        {cardModalState && (
          <CardModal
            card={cardModalState.card}
            onSave={handleSaveCard}
            onDelete={handleDeleteCard}
            onClose={closeCardModal}
          />
        )}

        <ReminderModal cards={firedCards} onSnooze={snoozeCard} onComplete={handleCompleteReminder} />
      </div>

      <Meadow completionSignal={justCompletedCardId} />
    </>
  )
}
