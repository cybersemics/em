import { store } from './store'
import { ROOT_TOKEN } from './constants'
import * as db from './data-providers/dexie'
import { initialize } from './initialize'
import { getChildren, getThought, getThoughtsRanked } from './selectors'

// mock debounce to use 0 delay
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),

  // jest.mock must be inline
  // possible workarounds: https://stackoverflow.com/questions/40465047/how-can-i-mock-an-es6-module-import-using-jest
  debounce: jest.fn().mockImplementation((callback, delay) => {
    let timer = null
    let pendingArgs = null

    const cancel = jest.fn(() => {
      if (timer) {
        clearTimeout(timer)
      }
      timer = null
      pendingArgs = null
    })

    const flush = jest.fn(() => {
      if (timer) {
        callback(...pendingArgs)
        cancel()
      }
    })

    const wrapped = (...args) => {
      cancel()

      pendingArgs = args

      // TODO: why doesn't jest.runAllTimers work here?
      // use 0 instead of given delay as a workaround
      timer = setTimeout(flush, 0)
    }

    wrapped.cancel = cancel
    wrapped.flush = flush
    wrapped.delay = delay

    return wrapped
  }),
}))


beforeAll(async () => {
  await initialize()

  // fake timers cause an infinite loop on _.debounce
  // Jest v26 contains a 'modern' option for useFakeTimers, but create-react-app uses an older version of jest
  // https://github.com/facebook/jest/issues/3465#issuecomment-504908570
  jest.useFakeTimers()
  jest.runAllTimers()
})

afterEach(async () => {
  store.dispatch({ type: 'clear' })
  await db.clearAll()
})

it('load settings into indexedDB on initialization', async () => {
  const thoughtState = getThought(store.getState(), 'Settings')

  expect(thoughtState).not.toBeUndefined()
  expect(thoughtState.contexts).toHaveLength(1)

  // TODO: Tests fail without a dummy call to the database. Why?
  await db.getHelpers()

  const thoughtDB = await db.getThought('Settings')

  expect(thoughtDB).not.toBeUndefined()
  expect(thoughtDB.contexts).toHaveLength(1)

  expect(thoughtState.contexts[0].id).toEqual(thoughtDB.contexts[0].id)
})

it('persist newThought', async () => {

  store.dispatch({ type: 'newThought', value: 'a' })

  jest.runAllTimers()

  const parentEntryRoot = await db.getContext([ROOT_TOKEN])

  expect(parentEntryRoot).toMatchObject({
    children: [{ value: 'a', rank: 0 }]
  })
})

it('persist existingThoughtChange', async () => {

  store.dispatch([
    { type: 'newThought', value: '' },
    {
      type: 'existingThoughtChange',
      context: [ROOT_TOKEN],
      oldValue: '',
      newValue: 'a',
      thoughtsRanked: [{ value: '', rank: 0 }]
    }
  ])

  jest.runAllTimers()

  const parentEntryRoot = await db.getContext([ROOT_TOKEN])

  expect(parentEntryRoot).toMatchObject({
    children: [{ value: 'a', rank: 0 }]
  })

  await initialize()
})

it('load thought', async () => {

  // create a thought, which will get persisted to local db
  store.dispatch({ type: 'newThought', value: 'a' })
  jest.runAllTimers()

  const parentEntryRoot = await db.getContext([ROOT_TOKEN])
  expect(parentEntryRoot).toMatchObject({
    children: [{ value: 'a', rank: 0 }]
  })

  // clear state
  store.dispatch({ type: 'clear' })
  jest.runAllTimers()

  const children = getChildren(store.getState(), [ROOT_TOKEN])
  expect(children).toHaveLength(0)

  // confirm thought is still in local db after state has been cleared
  const parentEntryRootAfterReload = await db.getContext([ROOT_TOKEN])
  expect(parentEntryRootAfterReload).toMatchObject({
    children: [{ value: 'a', rank: 0 }]
  })

  // call initialize again to reload from db (simulating page refresh)
  await initialize()

  const childrenAfterInitialize = getChildren(store.getState(), [ROOT_TOKEN])
  expect(childrenAfterInitialize).toMatchObject([
    { value: 'a', rank: 0 }
  ])
})
