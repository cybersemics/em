import { store } from '../../store'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import { getChildren } from '../../selectors'
import { importText } from '../../action-creators'
import * as dexie from '../../data-providers/dexie'
import getContext from '../../data-providers/data-helpers/getContext'
import { DataProvider } from '../../data-providers/DataProvider'

jest.useFakeTimers()

// mock debounce and throttle
// fake timers cause an infinite loop on _.debounce
// Jest v26 contains a 'modern' option for useFakeTimers (https://github.com/facebook/jest/pull/7776), but I am getting a "TypeError: Cannot read property 'useFakeTimers' of undefined" error when I call jest.useFakeTimers('modern'). The same error does not uccor when I use 'legacy' or omit the argument (react-scripts v4.0.0-next.64).
// https://github.com/facebook/jest/issues/3465#issuecomment-504908570
jest.mock('lodash', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { debounce, throttle } = require('../../test-helpers/mock-debounce-throttle')
  return Object.assign({},
    jest.requireActual('lodash'),
    {
      debounce,
      throttle,
    }
  )
})

const db = dexie as DataProvider

/** Switch to real timers to set a real delay, then set back to fake timers. This was the only thing that worked to force the test to wait for flushPending (or getManyDescendants?) to complete. */
const delay = async (n: number) => {
  jest.useRealTimers()
  await new Promise(resolve => setTimeout(resolve, n))
  jest.useFakeTimers()
}

describe('thoughtCache', () => {

  beforeEach(async () => {
    await initialize()
    jest.runOnlyPendingTimers()
  })

  afterEach(async () => {
    store.dispatch({ type: 'clear' })
    await db.clearAll()
    jest.runOnlyPendingTimers()
  })

  it('load thought', async () => {

    const parentEntryRoot1 = await getContext(db, [ROOT_TOKEN])
    jest.runOnlyPendingTimers()
    expect(parentEntryRoot1).toBeUndefined()

    // create a thought, which will get persisted to local db
    store.dispatch({ type: 'newThought', value: 'a' })
    jest.runOnlyPendingTimers()

    const parentEntryRoot = await getContext(db, [ROOT_TOKEN])
    jest.runOnlyPendingTimers()
    expect(parentEntryRoot).toMatchObject({
      children: [{ value: 'a', rank: 0 }]
    })

    // clear state
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()

    const children = getChildren(store.getState(), [ROOT_TOKEN])
    expect(children).toHaveLength(0)

    // confirm thought is still in local db after state has been cleared
    const parentEntryRootAfterReload = await getContext(db, [ROOT_TOKEN])
    jest.runOnlyPendingTimers()
    expect(parentEntryRootAfterReload).toMatchObject({
      children: [{ value: 'a' }]
    })

    // clear and call initialize again to reload from db (simulating page refresh)
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()
    await initialize()
    await delay(100)

    const childrenAfterInitialize = getChildren(store.getState(), [ROOT_TOKEN])
    expect(childrenAfterInitialize).toMatchObject([
      { value: 'a' }
    ])
  })

  it.skip('delete thought with buffered descendants', async () => {

    store.dispatch([
      importText(RANKED_ROOT, `
      - x
      - a
        - b
          - c
            - d
              - e`),
      { type: 'setCursor', path: [{ value: 'x', rank: 0 }] },
    ])

    jest.runOnlyPendingTimers()

    expect(await getContext(db, [ROOT_TOKEN])).toMatchObject({ children: [{ value: 'x' }, { value: 'a' }] })
    expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'b' }] })
    expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
    expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
    expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })

    // clear and call initialize again to reload from db (simulating page refresh)
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()
    await initialize()
    await delay(100)

    // delete thought with buffered descendants
    store.dispatch({
      type: 'existingThoughtDelete',
      context: [ROOT_TOKEN],
      thoughtRanked: { value: 'a', rank: 1 }
    })
    jest.runOnlyPendingTimers()

    expect(getChildren(store.getState(), [ROOT_TOKEN])).toMatchObject([{ value: 'x' }])

    expect(await getContext(db, [ROOT_TOKEN])).toMatchObject({ children: [{ value: 'x' }] })
    expect(await getContext(db, ['a'])).toBeFalsy()

    // TODO: Load buffered thoughts into state to delete them
    expect(await getContext(db, ['a', 'b'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
  })

  it('load buffered thoughts', async () => {

    store.dispatch([
      importText(RANKED_ROOT, `
      - a
        - b
          - c
            - d
              - e`),
    ])

    jest.runOnlyPendingTimers()

    expect(await getContext(db, [ROOT_TOKEN])).toMatchObject({ children: [{ value: 'a' }] })
    expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'b' }] })
    expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
    expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
    expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })

    // clear state
    // call initialize again to reload from db (simulating page refresh)
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()
    await initialize()
    await delay(200)

    const state = store.getState()
    expect(getChildren(state, [ROOT_TOKEN])).toMatchObject([{ value: 'a' }])
    expect(getChildren(state, ['a'])).toMatchObject([{ value: 'b' }])
    expect(getChildren(state, ['a', 'b'])).toMatchObject([{ value: 'c' }])
    expect(getChildren(state, ['a', 'b', 'c'])).toMatchObject([{ value: 'd' }])
    expect(getChildren(state, ['a', 'b', 'c', 'd'])).toMatchObject([{ value: 'e' }])
  })

})
