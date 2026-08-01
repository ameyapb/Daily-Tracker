import { resetTestDatabase } from './testDbClient.js'

export default async function globalSetup() {
  await resetTestDatabase()
}
