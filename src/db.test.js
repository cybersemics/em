import { store } from './store'
import * as db from './data-providers/dexie'
import { initialize } from './initialize'
import { getThought } from './selectors'

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
