import { supabase } from '../supabaseClient'

const LANES_TABLE = 'lanes'

export async function fetchLanes() {
  const { data, error } = await supabase
    .from(LANES_TABLE)
    .select('*')
    .order('position', { ascending: true })

  if (error) throw error
  return data
}

export async function createLane({ name, position }) {
  const { data, error } = await supabase
    .from(LANES_TABLE)
    .insert({ name, position })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function renameLane(laneId, name) {
  const { data, error } = await supabase
    .from(LANES_TABLE)
    .update({ name })
    .eq('id', laneId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function reorderLane(laneId, position) {
  const { data, error } = await supabase
    .from(LANES_TABLE)
    .update({ position })
    .eq('id', laneId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLane(laneId) {
  const { error } = await supabase.from(LANES_TABLE).delete().eq('id', laneId)

  if (error) throw error
}

export async function fetchSystemLane(systemType) {
  const { data, error } = await supabase
    .from(LANES_TABLE)
    .select('*')
    .eq('system_type', systemType)
    .single()

  if (error) throw error
  return data
}
