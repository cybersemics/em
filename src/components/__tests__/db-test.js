import { initialize } from '../../App'
import { hashThought } from '../../util'
import { store } from '../../store'
import * as db from '../../db'

beforeAll(async () => {
  await initialize()
})

it('load settings into indexedDB on initialization', async () => {
  const hash = hashThought('Settings')

  const thoughtState = store.getState().thoughts.thoughtIndex[hash]

  expect(thoughtState).not.toBeUndefined()
  expect(thoughtState.contexts.length).toEqual(1)

  const thoughtDB = await db.getThought(hash)

  expect(thoughtDB).not.toBeUndefined()
  expect(thoughtDB.contexts.length).toEqual(1)

  expect(thoughtState.contexts[0].id).toEqual(thoughtDB.contexts[0].id)
})

it('presist data on indexedDB after adding new thought', async () => {

  await store.dispatch({ type: 'newThought', value: 'db-test' })
  const hash = hashThought('db-test')

  const thoughtState = store.getState().thoughts.thoughtIndex[hash]

  expect(thoughtState).not.toBeUndefined()
  expect(thoughtState.contexts.length).toEqual(1)

  const thoughtDB = await db.getThought(hash)

  expect(thoughtDB).not.toBeUndefined()
  expect(thoughtDB.contexts.length).toEqual(1)

  expect(thoughtState.contexts[0].id).toEqual(thoughtDB.contexts[0].id)
})
