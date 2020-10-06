import { store } from '../../store'
import { ROOT_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import { getThought } from '../../selectors'
import initDB, * as db from '../dexie'
import dataProviderTest from '../../test-helpers/dataProviderTest'
import getContext from '../data-helpers/getContext'
import dbGetThought from '../data-helpers/getThought'

jest.useFakeTimers()

// mock debounce and throttle
// fake timers cause an infinite loop on _.debounce
// Jest v26 contains a 'modern' option for useFakeTimers (https://github.com/facebook/jest/pull/7776), but I am getting a "TypeError: Cannot read property 'useFakeTimers' of undefined" error when I call jest.useFakeTimers('modern'). The same error does not uccor when I use 'legacy' or omit the argument (react-scripts v4.0.0-next.64).
// https://github.com/facebook/jest/issues/3465#issuecomment-504908570
jest.mock('lodash', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { debounce, throttle } = require('../../test-helpers/mock-debounce-throttle')
  return {
    ...jest.requireActual('lodash'),
    debounce,
    throttle,
  }
})

describe('dexie', () => {

  beforeEach(initDB)
  afterEach(db.clearAll)
  dataProviderTest(db)

})

describe('integration', () => {

  beforeEach(async () => {
    await initialize()
    jest.runOnlyPendingTimers()
  })

  afterEach(async () => {
    store.dispatch({ type: 'clear' })
    await db.clearAll()
    jest.runOnlyPendingTimers()
  })

  it('load settings into indexedDB on initialization', async () => {
    const thoughtState = getThought(store.getState(), 'Settings')

    expect(thoughtState).not.toBeUndefined()
    expect(thoughtState.contexts).toHaveLength(1)

    // TODO: Tests fail without a dummy call to the database. Why?
    await db.getHelpers()

    const thoughtDB = await dbGetThought(db, 'Settings')

    expect(thoughtDB).not.toBeUndefined()
    expect(thoughtDB!.contexts).toHaveLength(1)

    expect(thoughtState.contexts[0].id).toEqual(thoughtDB!.contexts[0].id)
  })

  it('persist newThought', async () => {

    store.dispatch({ type: 'newThought', value: 'a' })

    jest.runOnlyPendingTimers()

    const parentEntryRoot = await getContext(db, [ROOT_TOKEN])

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

    jest.runOnlyPendingTimers()

    const parentEntryRoot = await getContext(db, [ROOT_TOKEN])

    expect(parentEntryRoot).toMatchObject({
      children: [{ value: 'a', rank: 0 }]
    })

    await initialize()
    jest.runOnlyPendingTimers()
  })

})
