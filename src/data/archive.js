import { supabase } from '../supabaseClient'

const CARDS_ARCHIVE_TABLE = 'cards_archive'

// The COMPLETED lane resets once the local calendar day rolls over, not on a
// rolling 24h window, so a card completed at 11pm is cleared shortly after
// midnight rather than staying visible until the next evening.
export function isFromPreviousLocalDay(isoString, now = new Date()) {
  const completedAt = new Date(isoString)
  return (
    completedAt.getFullYear() !== now.getFullYear() ||
    completedAt.getMonth() !== now.getMonth() ||
    completedAt.getDate() !== now.getDate()
  )
}

export async function archiveCard(card) {
  const { data, error } = await supabase
    .from(CARDS_ARCHIVE_TABLE)
    .insert({
      original_card_id: card.id,
      lane_id: card.lane_id,
      name: card.name,
      description: card.description,
      remind_at: card.remind_at,
      status: card.status,
      position: card.position,
      created_at: card.created_at,
      completed_at: card.completed_at,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
