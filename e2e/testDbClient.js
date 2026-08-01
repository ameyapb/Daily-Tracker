import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const ENV_TEST_FILE_PATH = fileURLToPath(new URL('../.env.test', import.meta.url))

function loadEnvTestFile() {
  const contents = readFileSync(ENV_TEST_FILE_PATH, 'utf-8')
  const values = {}
  for (const line of contents.split('\n')) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue
    const separatorIndex = trimmedLine.indexOf('=')
    if (separatorIndex === -1) continue
    values[trimmedLine.slice(0, separatorIndex)] = trimmedLine.slice(separatorIndex + 1)
  }
  return values
}

const envTestValues = loadEnvTestFile()
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? envTestValues.VITE_SUPABASE_URL
const supabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? envTestValues.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.test. E2E tests must run against a dedicated test Supabase project.',
  )
}

export const testDbClient = createClient(supabaseUrl, supabasePublishableKey)

export async function resetTestDatabase() {
  const { error: deleteCardsError } = await testDbClient
    .from('cards')
    .delete()
    .not('id', 'is', null)
  if (deleteCardsError) throw deleteCardsError

  const { error: deleteArchiveError } = await testDbClient
    .from('cards_archive')
    .delete()
    .not('id', 'is', null)
  if (deleteArchiveError) throw deleteArchiveError

  const { error: deleteUserLanesError } = await testDbClient
    .from('lanes')
    .delete()
    .eq('is_system', false)
  if (deleteUserLanesError) throw deleteUserLanesError
}
