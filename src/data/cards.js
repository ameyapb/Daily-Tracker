import { supabase } from '../supabaseClient'
import { fetchSystemLane } from './lanes'
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

// Status transitions to DELAYED/COMPLETED must move the card into the
// matching system lane in the same update, per CLAUDE.md: both fields are
// set together in the data layer, not left for a DB trigger.
export async function setCardStatus(cardId, status) {
  const systemLaneType = STATUS_TO_SYSTEM_LANE_TYPE[status]

  const updates = { status }

  if (systemLaneType) {
    const systemLane = await fetchSystemLane(systemLaneType)
    updates.lane_id = systemLane.id
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
