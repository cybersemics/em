import { store } from './store'
import * as db from './data-providers/dexie'
import { initialize } from './initialize'
import { hashThought } from './util'
import { getThought } from './selectors'

beforeAll(async () => {
  await initialize()
})

// TODO: Make pass with iterative loading
it.skip('load settings into indexedDB on initialization', async () => {
  const hash = hashThought('Settings')

  const thoughtState = getThought(store.getState(), 'Settings')

  expect(thoughtState).not.toBeUndefined()
  expect(thoughtState.contexts).toHaveLength(1)

  const thoughtDB = await db.getThought(hash)

  expect(thoughtDB).not.toBeUndefined()
  expect(thoughtDB.contexts).toHaveLength(1)

  expect(thoughtState.contexts[0].id).toEqual(thoughtDB.contexts[0].id)
})
