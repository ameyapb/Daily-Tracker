import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
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
import { Meadow } from './Meadow'
import { MEADOW_STRIP_HEIGHT_PX, CARD_DROP_SETTLE_FLAG_DURATION_MS } from './meadowConstants'
import { LANE_DRAG_TYPE, CARD_DRAG_TYPE } from './dragTypes'
import './Board.css'

export function computeLiveLaneOrder(activeId, overId, userLanes, previousOrder) {
  const baseOrder = previousOrder ?? userLanes.map((lane) => lane.id)
  if (!overId) return baseOrder

  const oldIndex = baseOrder.indexOf(activeId)
  const newIndex = baseOrder.indexOf(overId)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return baseOrder

  return arrayMove(baseOrder, oldIndex, newIndex)
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
  if (over.data.current?.type === CARD_DRAG_TYPE && over.id !== draggedCard.id) {
    const overIndex = cardsInTargetLane.findIndex((card) => card.id === over.id)
    const isMovingWithinSameLane = draggedCard.lane_id === targetLaneId
    const insertAt = overIndex === -1 ? cardsInTargetLane.length : isMovingWithinSameLane ? overIndex + 1 : overIndex
    cardIds = [
      ...cardsInTargetLane.slice(0, insertAt).map((card) => card.id),
      draggedCard.id,
      ...cardsInTargetLane.slice(insertAt).map((card) => card.id),
    ]
  } else if (over.data.current?.type === CARD_DRAG_TYPE && over.id === draggedCard.id) {
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

function handleCardDragEnd(
  active,
  over,
  cards,
  lanes,
  moveCardToLane,
  setCardStatus,
  moveCardOutOfSystemLane,
  reorderCardsInLane,
) {
  const draggedCard = active.data.current.card
  const targetLaneId = targetLaneIdFor(over)
  if (!targetLaneId) return

  if (draggedCard.lane_id !== targetLaneId) {
    const sourceLane = lanes.find((lane) => lane.id === draggedCard.lane_id)
    const targetLane = lanes.find((lane) => lane.id === targetLaneId)
    const targetStatus = targetLane?.is_system ? SYSTEM_LANE_TYPE_TO_STATUS[targetLane.system_type] : null

    if (targetStatus && draggedCard.status !== targetStatus) {
      setCardStatus(draggedCard.id, targetStatus)
    } else if (sourceLane?.is_system) {
      moveCardOutOfSystemLane(draggedCard.id, targetLaneId)
    } else {
      moveCardToLane(draggedCard.id, targetLaneId)
    }
    return
  }

  if (over.data.current?.type !== CARD_DRAG_TYPE) return

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

    if (active.data.current?.type === CARD_DRAG_TYPE) {
      flagCardAsJustDropped(active.id)
    }

    if (!over || active.id === over.id) return

    if (active.data.current?.type === LANE_DRAG_TYPE) {
      handleLaneDragEnd(active, over, lanes, reorderUserLanes)
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
      )
    }
  }

  function handleDragCancel() {
    setActiveDragCard(null)
    setActiveDragLane(null)
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

  const userLanes = lanes.filter((lane) => !lane.is_system)
  const systemLanes = lanes.filter((lane) => lane.is_system)
  const cardsByLaneId = (laneId) => cards.filter((card) => card.lane_id === laneId)

  return (
    <>
      <div className="board" style={{ '--meadow-height-px': `${MEADOW_STRIP_HEIGHT_PX}px` }}>
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
          onDragStart={handleDragStart}
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
                isAnyCardDragging={activeDragCard !== null}
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
              isAnyCardDragging={activeDragCard !== null}
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
