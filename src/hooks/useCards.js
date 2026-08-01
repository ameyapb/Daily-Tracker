import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchCards,
  createCard as createCardRequest,
  updateCard as updateCardRequest,
  deleteCard as deleteCardRequest,
  moveCardToLane as moveCardToLaneRequest,
  reorderCard as reorderCardRequest,
  setCardStatus as setCardStatusRequest,
} from '../data/cards'
import { CARD_STATUS } from '../data/constants'
import { RABBIT_IN_A_HAT_ANIMATION_DURATION_MS } from '../components/meadowConstants'
import { useMutationError } from './useMutationError'
import { nextPosition, reorderAndDiff } from './reorderUtils'

const CARD_STARTING_POSITION = 0

function nextCardPositionInLane(cards, laneId) {
  return nextPosition(
    cards.filter((card) => card.lane_id === laneId),
    CARD_STARTING_POSITION,
  )
}

export function useCards() {
  const [cards, setCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [justCompletedCardId, setJustCompletedCardId] = useState(null)
  const justCompletedTimeoutRef = useRef(null)
  const { mutationError, clearMutationError, runMutation } = useMutationError()

  useEffect(() => {
    return () => clearTimeout(justCompletedTimeoutRef.current)
  }, [])

  const flagJustCompleted = useCallback((cardId) => {
    clearTimeout(justCompletedTimeoutRef.current)
    setJustCompletedCardId(cardId)
    justCompletedTimeoutRef.current = setTimeout(
      () => setJustCompletedCardId(null),
      RABBIT_IN_A_HAT_ANIMATION_DURATION_MS,
    )
  }, [])

  const loadCards = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchCards()
      setCards(data)
      setError(null)
    } catch (loadError) {
      setError(loadError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  const createCard = useCallback(
    async (laneId, { name, description, remindAt, status }) =>
      runMutation(async () => {
        const created = await createCardRequest({
          laneId,
          name,
          description,
          remindAt,
          status,
          position: nextCardPositionInLane(cards, laneId),
        })
        setCards((currentCards) => [...currentCards, created])
        return created
      }),
    [cards, runMutation],
  )

  const updateCard = useCallback(
    async (cardId, updates) =>
      runMutation(async () => {
        const currentCard = cards.find((card) => card.id === cardId)
        const { status, ...fieldUpdates } = updates
        const statusChanged = status !== undefined && status !== currentCard?.status

        if (Object.keys(fieldUpdates).length > 0) {
          const updated = await updateCardRequest(cardId, fieldUpdates)
          setCards((currentCards) => currentCards.map((card) => (card.id === cardId ? updated : card)))
        }

        if (statusChanged) {
          const updated = await setCardStatusRequest(cardId, status)
          setCards((currentCards) => currentCards.map((card) => (card.id === cardId ? updated : card)))
          if (status === CARD_STATUS.COMPLETED) flagJustCompleted(cardId)
          return updated
        }
      }),
    [cards, flagJustCompleted, runMutation],
  )

  const deleteCard = useCallback(
    async (cardId) =>
      runMutation(async () => {
        await deleteCardRequest(cardId)
        setCards((currentCards) => currentCards.filter((card) => card.id !== cardId))
      }),
    [runMutation],
  )

  const moveCardToLane = useCallback(
    async (cardId, laneId) =>
      runMutation(async () => {
        const position = nextCardPositionInLane(cards, laneId)
        const moved = await moveCardToLaneRequest(cardId, laneId, position)
        setCards((currentCards) => currentCards.map((card) => (card.id === cardId ? moved : card)))
        return moved
      }),
    [cards, runMutation],
  )

  const reorderCardsInLane = useCallback(
    async (laneId, orderedCardIds) =>
      runMutation(async () => {
        const reorderedIds = new Set(orderedCardIds)
        // Excluding by id rather than by lane_id: a card that just moved into
        // this lane may still carry its old lane_id here, and filtering on that
        // alone would keep it in `otherCards` and duplicate it in the new list.
        const otherCards = cards.filter(
          (card) => card.lane_id !== laneId && !reorderedIds.has(card.id),
        )
        const { reordered: reorderedCards, changed: changedCards } = reorderAndDiff(
          cards,
          orderedCardIds,
        )
        // Every card in this list now belongs to this lane by definition, so a
        // card that arrived via a cross-lane drop gets its stale lane_id corrected.
        const cardsInLane = reorderedCards.map((card) => ({ ...card, lane_id: laneId }))

        setCards([...otherCards, ...cardsInLane])

        await Promise.all(changedCards.map((card) => reorderCardRequest(card.id, card.position)))
      }),
    [cards, runMutation],
  )

  const setCardStatus = useCallback(
    async (cardId, status) =>
      runMutation(async () => {
        const updated = await setCardStatusRequest(cardId, status)
        setCards((currentCards) => currentCards.map((card) => (card.id === cardId ? updated : card)))
        if (status === CARD_STATUS.COMPLETED) flagJustCompleted(cardId)
        return updated
      }),
    [flagJustCompleted, runMutation],
  )

  // Dragging a card out of the DELAYED/COMPLETED system lane onto a specific
  // user lane both resets its status and honors the exact drop target, rather
  // than setCardStatus's own pre_system_lane_id restore (which may point
  // elsewhere).
  const moveCardOutOfSystemLane = useCallback(
    async (cardId, laneId) =>
      runMutation(async () => {
        await setCardStatusRequest(cardId, CARD_STATUS.IN_PROGRESS)
        const position = nextCardPositionInLane(cards, laneId)
        const moved = await moveCardToLaneRequest(cardId, laneId, position)
        setCards((currentCards) => currentCards.map((card) => (card.id === cardId ? moved : card)))
        return moved
      }),
    [cards, runMutation],
  )

  return {
    cards,
    isLoading,
    error,
    mutationError,
    clearMutationError,
    createCard,
    updateCard,
    deleteCard,
    moveCardToLane,
    reorderCardsInLane,
    setCardStatus,
    moveCardOutOfSystemLane,
    justCompletedCardId,
  }
}
