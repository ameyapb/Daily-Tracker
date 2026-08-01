import { supabase } from '../supabaseClient'
import { fetchSystemLane, fetchFirstUserLane } from './lanes'
import { CARD_STATUS, STATUS_TO_SYSTEM_LANE_TYPE } from './constants'

const CARDS_TABLE = 'cards'

export async function fetchCards() {
  const { data, error } = await supabase
    .from(CARDS_TABLE)
    .select('*')
    .order('position', { ascending: true })

  if (error) throw error
  return data
}

export async function createCard({
  laneId,
  name,
  description = null,
  remindAt = null,
  status = CARD_STATUS.TODO,
  position,
}) {
  const { data, error } = await supabase
    .from(CARDS_TABLE)
    .insert({
      lane_id: laneId,
      name,
      description,
      remind_at: remindAt,
      status,
      position,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCard(cardId, updates) {
  const { data, error } = await supabase
    .from(CARDS_TABLE)
    .update(updates)
    .eq('id', cardId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCard(cardId) {
  const { error } = await supabase.from(CARDS_TABLE).delete().eq('id', cardId)

  if (error) throw error
}

// Moving a card between user lanes never touches status, per the lane/status
// separation in CLAUDE.md's architecture.
export async function moveCardToLane(cardId, laneId, position) {
  const { data, error } = await supabase
    .from(CARDS_TABLE)
    .update({ lane_id: laneId, position })
    .eq('id', cardId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function reorderCard(cardId, position) {
  const { data, error } = await supabase
    .from(CARDS_TABLE)
    .update({ position })
    .eq('id', cardId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function fetchCard(cardId) {
  const { data, error } = await supabase.from(CARDS_TABLE).select('*').eq('id', cardId).single()

  if (error) throw error
  return data
}

// Status transitions to DELAYED/COMPLETED must move the card into the
// matching system lane in the same update, per CLAUDE.md: both fields are
// set together in the data layer, not left for a DB trigger. The card's lane
// going in is remembered on pre_system_lane_id so a later transition back to
// TODO/IN_PROGRESS can restore it instead of stranding the card in a system
// lane; leaving a system lane clears pre_system_lane_id, falling back to the
// first user lane if the original lane is gone or was never recorded.
export async function setCardStatus(cardId, status) {
  const systemLaneType = STATUS_TO_SYSTEM_LANE_TYPE[status]
  const currentCard = await fetchCard(cardId)
  const wasInSystemLane = STATUS_TO_SYSTEM_LANE_TYPE[currentCard.status] !== undefined
  const isLeavingSystemLane = !systemLaneType && wasInSystemLane

  const updates = { status }

  if (systemLaneType) {
    const systemLane = await fetchSystemLane(systemLaneType)
    updates.lane_id = systemLane.id
    updates.pre_system_lane_id = wasInSystemLane ? currentCard.pre_system_lane_id : currentCard.lane_id
  } else if (isLeavingSystemLane) {
    const restoredLane = currentCard.pre_system_lane_id ? null : await fetchFirstUserLane()
    updates.lane_id = currentCard.pre_system_lane_id ?? restoredLane?.id ?? currentCard.lane_id
    updates.pre_system_lane_id = null
  }

  updates.completed_at = status === CARD_STATUS.COMPLETED ? new Date().toISOString() : null

  const { data, error } = await supabase
    .from(CARDS_TABLE)
    .update(updates)
    .eq('id', cardId)
    .select()
    .single()

  if (error) throw error
  return data
}
