import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable'
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

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
  }

  function openCreateCardModal(laneId) {
    setCardModalState({ laneId })
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
                justCompletedCardId={justCompletedCardId}
                isAnyCardDragging={activeDragCard !== null}
                justDroppedCardId={justDroppedCardId}
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
              justCompletedCardId={justCompletedCardId}
              isAnyCardDragging={activeDragCard !== null}
              justDroppedCardId={justDroppedCardId}
            />
          ))}

          <DragOverlay>
            {activeDragCard && <Card card={activeDragCard} onOpen={() => {}} isOverlay />}
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
          <button type="submit" className="board__add-lane-button">
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

      <Meadow />
    </>
  )
}
