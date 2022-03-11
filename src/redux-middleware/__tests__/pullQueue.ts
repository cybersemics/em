import { store } from '../../store'
import { HOME_TOKEN } from '../../constants'
import { clear, importText, newThought, setCursor } from '../../action-creators'
import { getAllChildren, getThoughtByContext } from '../../selectors'
import * as dexie from '../../data-providers/dexie'
import getContext from '../../data-providers/data-helpers/getContext'
import getThoughtByIdFromDB from '../../data-providers/data-helpers/getThoughtById'
import { DataProvider } from '../../data-providers/DataProvider'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import { Context, Thought } from '../../@types'
import testTimer from '../../test-helpers/testTimer'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'
import { deleteThoughtAtFirstMatchActionCreator } from '../../test-helpers/deleteThoughtAtFirstMatch'
import { moveThoughtAtFirstMatchActionCreator } from '../../test-helpers/moveThoughtAtFirstMatch'
import { editThoughtAtFirstMatchActionCreator } from '../../test-helpers/editThoughtAtFirstMatch'

/*
  Note: sinon js fake timer is used to overcome some short comming we have with jest's fake timer.
  For details: https://github.com/cybersemics/em/issues/919#issuecomment-739135971
*/

const fakeTimer = testTimer()

const db = dexie as DataProvider

/**
 * Match given children with for given context.
 */
const matchContextsChildren = async (provider: DataProvider, context: Context, children: Partial<Thought>[]) => {
  const parentThought = (await getContext(provider, context))!
  expect(parentThought).toBeTruthy()
  const childrenThoughts = await provider.getThoughtsByIds(parentThought.children)
  expect(childrenThoughts).toMatchObject(children)
}

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('disable isLoading after initialize', async () => {
  expect(store.getState().isLoading).toBe(false)
})

it('load thought', async () => {
  const parentEntryRoot1 = await getContext(db, [HOME_TOKEN])
  expect(parentEntryRoot1).toBeFalsy()

  fakeTimer.useFakeTimer()

  // create a thought, which will get persisted to local db
  store.dispatch(newThought({ value: 'a' }))

  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  const thoughtA = getThoughtByContext(store.getState(), ['a'])

  const parentEntryRoot = await getContext(db, [HOME_TOKEN])
  expect(parentEntryRoot).toMatchObject({
    children: [thoughtA?.id],
  })

  fakeTimer.useFakeTimer()
  // clear state
  store.dispatch(clear())
  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  const children = getAllChildren(store.getState(), [HOME_TOKEN])
  expect(children).toHaveLength(0)

  // Note: Always use real timer before awaiting db calls. https://github.com/cybersemics/em/issues/919#issuecomment-739135971

  // confirm thought is still in local db after state has been cleared
  const parentEntryRootAfterReload = await getContext(db, [HOME_TOKEN])
  expect(parentEntryRootAfterReload).toMatchObject({
    children: [thoughtA?.id],
  })

  await refreshTestApp()

  const childrenAfterInitialize = getAllChildren(store.getState(), [HOME_TOKEN])
  expect(childrenAfterInitialize).toMatchObject([thoughtA?.id])
})

it('do not repopulate deleted thought', async () => {
  fakeTimer.useFakeTimer()

  store.dispatch([
    newThought({}),
    deleteThoughtAtFirstMatchActionCreator(['']),
    // Need to setCursor to trigger the pullQueue
    // Must set cursor manually since deleteThought does not.
    // (The cursor is normally set after deleting via the deleteThoughtWithCursor reducer).
    setCursor({ path: null }),
  ])

  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  const parentEntryRoot = getThoughtByContext(store.getState(), [HOME_TOKEN])
  expect(parentEntryRoot).toMatchObject({
    children: [],
  })

  const parentEntryChild = getThoughtByContext(store.getState(), [''])
  expect(parentEntryChild).toBe(null)
})

it('load buffered thoughts', async () => {
  fakeTimer.useFakeTimer()

  store.dispatch(
    importText({
      text: `
      - a
        - b
          - c
            - d
              - e`,
    }),
  )

  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  const thoughtA = getThoughtByContext(store.getState(), ['a'])!
  const thoughtB = getThoughtByContext(store.getState(), ['a', 'b'])!
  const thoughtC = getThoughtByContext(store.getState(), ['a', 'b', 'c'])!
  const thoughtD = getThoughtByContext(store.getState(), ['a', 'b', 'c', 'd'])!
  const thoughtE = getThoughtByContext(store.getState(), ['a', 'b', 'c', 'd', 'e'])!

  await matchContextsChildren(db, [HOME_TOKEN], [{ value: 'a' }])
  await matchContextsChildren(db, ['a'], [{ value: 'b' }])
  await matchContextsChildren(db, ['a', 'b'], [{ value: 'c' }])
  await matchContextsChildren(db, ['a', 'b', 'c'], [{ value: 'd' }])
  await matchContextsChildren(db, ['a', 'b', 'c', 'd'], [{ value: 'e' }])
  await matchContextsChildren(db, ['a', 'b', 'c', 'd', 'e'], [])

  // clear state
  // call initialize again to reload from db (simulating page refresh)

  await refreshTestApp()

  const state = store.getState()
  expect(getAllChildren(state, [HOME_TOKEN])).toMatchObject([thoughtA.id])
  expect(getAllChildren(state, ['a'])).toMatchObject([thoughtB.id])
  expect(getAllChildren(state, ['a', 'b'])).toMatchObject([thoughtC.id])
  expect(getAllChildren(state, ['a', 'b', 'c'])).toMatchObject([thoughtD.id])
  expect(getAllChildren(state, ['a', 'b', 'c', 'd'])).toMatchObject([thoughtE.id])
  expect(getAllChildren(state, ['a', 'b', 'c', 'd', 'e'])).toMatchObject([])
})

it('delete thought with buffered descendants', async () => {
  fakeTimer.useFakeTimer()

  store.dispatch([
    importText({
      text: `
        - x
        - a
          - b
            - c
              - d
                - e
    `,
    }),
    setCursorFirstMatchActionCreator(['x']),
  ])

  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  await matchContextsChildren(db, [HOME_TOKEN], [{ value: 'x' }, { value: 'a' }])
  await matchContextsChildren(db, ['a'], [{ value: 'b' }])
  await matchContextsChildren(db, ['a', 'b'], [{ value: 'c' }])
  await matchContextsChildren(db, ['a', 'b', 'c'], [{ value: 'd' }])
  await matchContextsChildren(db, ['a', 'b', 'c', 'd'], [{ value: 'e' }])
  await matchContextsChildren(db, ['a', 'b', 'c', 'd', 'e'], [])

  await refreshTestApp()

  fakeTimer.useFakeTimer()

  // delete thought with buffered descendants
  store.dispatch(deleteThoughtAtFirstMatchActionCreator(['a']))
  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  await matchContextsChildren(db, [HOME_TOKEN], [{ value: 'x' }])
  expect(await getContext(db, ['a'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()
})

it('move thought with buffered descendants', async () => {
  fakeTimer.useFakeTimer()

  store.dispatch([
    importText({
      text: `
        - x
        - a
          - m
          - b
            - c
              - d
                - e
    `,
    }),
    setCursorFirstMatchActionCreator(['x']),
  ])

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  const thoughtX = getThoughtByContext(store.getState(), ['x'])!
  const thoughtA = getThoughtByContext(store.getState(), ['a'])!
  const thoughtM = getThoughtByContext(store.getState(), ['a', 'm'])!
  const thoughtB = getThoughtByContext(store.getState(), ['a', 'b'])!
  const thoughtC = getThoughtByContext(store.getState(), ['a', 'b', 'c'])!
  const thoughtD = getThoughtByContext(store.getState(), ['a', 'b', 'c', 'd'])!
  const thoughtE = getThoughtByContext(store.getState(), ['a', 'b', 'c', 'd', 'e'])!

  expect(await getThoughtByIdFromDB(db, HOME_TOKEN)).toMatchObject({ children: [thoughtX.id, thoughtA.id] })
  expect(await getThoughtByIdFromDB(db, thoughtA.id)).toMatchObject({ children: [thoughtM.id, thoughtB.id] })
  expect(await getThoughtByIdFromDB(db, thoughtB.id)).toMatchObject({ children: [thoughtC.id] })
  expect(await getThoughtByIdFromDB(db, thoughtM.id)).toMatchObject({ children: [] })
  expect(await getThoughtByIdFromDB(db, thoughtC.id)).toMatchObject({ children: [thoughtD.id] })
  expect(await getThoughtByIdFromDB(db, thoughtD.id)).toMatchObject({ children: [thoughtE.id] })
  expect(await getThoughtByIdFromDB(db, thoughtE.id)).toMatchObject({ children: [] })

  await refreshTestApp()

  fakeTimer.useFakeTimer()

  // delete thought with buffered descendants
  store.dispatch(
    moveThoughtAtFirstMatchActionCreator({
      from: ['a'],
      to: ['x', 'a'],
      newRank: 0,
    }),
  )

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  await matchContextsChildren(db, [HOME_TOKEN], [{ value: 'x' }])
  expect(await getContext(db, ['a'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()

  await matchContextsChildren(db, ['x'], [{ value: 'a' }])
  await matchContextsChildren(db, ['x', 'a'], [{ value: 'm' }, { value: 'b' }])
  await matchContextsChildren(db, ['x', 'a', 'b'], [{ value: 'c' }])
  await matchContextsChildren(db, ['x', 'a', 'b', 'c'], [{ value: 'd' }])
  await matchContextsChildren(db, ['x', 'a', 'b', 'c', 'd'], [{ value: 'e' }])
  await matchContextsChildren(db, ['x', 'a', 'b', 'c', 'd', 'e'], [])
})

it('edit thought with buffered descendants', async () => {
  fakeTimer.useFakeTimer()

  store.dispatch([
    importText({
      text: `
        - x
        - a
          - m
          - b
            - c
              - d
                - e
    `,
    }),
    setCursorFirstMatchActionCreator(['x']),
  ])

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  await matchContextsChildren(db, [HOME_TOKEN], [{ value: 'x' }, { value: 'a' }])
  await matchContextsChildren(db, ['a'], [{ value: 'm' }, { value: 'b' }])
  await matchContextsChildren(db, ['a', 'b'], [{ value: 'c' }])
  await matchContextsChildren(db, ['a', 'm'], [])
  await matchContextsChildren(db, ['a', 'b', 'c'], [{ value: 'd' }])
  await matchContextsChildren(db, ['a', 'b', 'c', 'd'], [{ value: 'e' }])
  await matchContextsChildren(db, ['a', 'b', 'c', 'd', 'e'], [])

  await refreshTestApp()
  fakeTimer.useFakeTimer()

  // delete thought with buffered descendants
  store.dispatch(
    editThoughtAtFirstMatchActionCreator({
      at: ['a'],
      oldValue: 'a',
      newValue: 'k',
    }),
  )

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  await matchContextsChildren(db, [HOME_TOKEN], [{ value: 'x' }, { value: 'k' }])
  expect(await getContext(db, ['a'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()

  await matchContextsChildren(db, ['k'], [{ value: 'm' }, { value: 'b' }])
  await matchContextsChildren(db, ['k!', 'b'], [{ value: 'c' }])
  await matchContextsChildren(db, ['k!', 'b', 'c'], [{ value: 'd' }])
  await matchContextsChildren(db, ['k!', 'b', 'c', 'd'], [{ value: 'e' }])
  await matchContextsChildren(db, ['k!', 'b', 'c', 'd', 'e'], [])
})

it('export thought with buffered descendants', async () => {
  fakeTimer.useFakeTimer()

  store.dispatch([
    importText({
      text: `
        - x
        - a
          - b
            - c
              - d
                - e
    `,
    }),
    setCursorFirstMatchActionCreator(['x']),
  ])

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  await matchContextsChildren(db, [HOME_TOKEN], [{ value: 'x' }, { value: 'a' }])
  await matchContextsChildren(db, ['a'], [{ value: 'b' }])
  await matchContextsChildren(db, ['a', 'b'], [{ value: 'c' }])
  await matchContextsChildren(db, ['a', 'b', 'c'], [{ value: 'd' }])
  await matchContextsChildren(db, ['a', 'b', 'c', 'd'], [{ value: 'e' }])
  await matchContextsChildren(db, ['a', 'b', 'c', 'd', 'e'], [])

  await refreshTestApp()
  fakeTimer.useFakeTimer()

  // delete thought with buffered descendants
  store.dispatch(deleteThoughtAtFirstMatchActionCreator(['a']))

  await fakeTimer.runAllAsync()

  // wait until thoughts are buffered in and then deleted in a separate deleteThought call
  // deleteThought -> pushQueue -> thoughtCache -> deleteThought

  fakeTimer.useRealTimer()

  await matchContextsChildren(db, [HOME_TOKEN], [{ value: 'x' }])
  expect(await getContext(db, ['a'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()
})
