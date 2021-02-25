import { store } from '../../store'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { clear, existingThoughtChange, existingThoughtDelete, existingThoughtMove, importText, newThought, setCursor } from '../../action-creators'
import { initialize } from '../../initialize'
import { getAllChildren, getParent, rankThoughtsFirstMatch } from '../../selectors'
import * as dexie from '../../data-providers/dexie'
import getContext from '../../data-providers/data-helpers/getContext'
import { DataProvider } from '../../data-providers/DataProvider'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import { SimplePath } from '../../types'
import testTimer from '../../test-helpers/testTimer'

/*
  Note: sinon js fake timer is used to overcome some short comming we have with jest's fake timer.
  For details: https://github.com/cybersemics/em/issues/919#issuecomment-739135971
*/

const fakeTimer = testTimer()

const db = dexie as DataProvider

beforeEach(async () => {
  fakeTimer.useFakeTimer()
  initialize()
  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()
})

afterEach(async () => {
  fakeTimer.useFakeTimer()
  store.dispatch(clear())
  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()
  await db.clearAll()
})

it('disable isLoading after initialize', async () => {
  expect(store.getState().isLoading).toBe(false)
})

it('load thought', async () => {

  const parentEntryRoot1 = await getContext(db, [HOME_TOKEN])
  expect(parentEntryRoot1).toBeUndefined()

  fakeTimer.useFakeTimer()

  // create a thought, which will get persisted to local db
  store.dispatch(newThought({ value: 'a' }))

  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  const parentEntryRoot = await getContext(db, [HOME_TOKEN])
  expect(parentEntryRoot).toMatchObject({
    children: [{ value: 'a', rank: 0 }]
  })

  fakeTimer.useFakeTimer()
  // clear state
  store.dispatch(clear())
  await fakeTimer.runAllAsync()

  const children = getAllChildren(store.getState(), [HOME_TOKEN])
  expect(children).toHaveLength(0)

  // Note: Always use real timer before awaiting db calls. https://github.com/cybersemics/em/issues/919#issuecomment-739135971
  fakeTimer.useRealTimer()

  // confirm thought is still in local db after state has been cleared
  const parentEntryRootAfterReload = await getContext(db, [HOME_TOKEN])
  expect(parentEntryRootAfterReload).toMatchObject({
    children: [{ value: 'a' }]
  })

  // clear and call initialize again to reload from db (simulating page refresh)
  store.dispatch(clear())
  fakeTimer.useFakeTimer()
  initialize()
  await fakeTimer.runAllAsync()

  const childrenAfterInitialize = getAllChildren(store.getState(), [HOME_TOKEN])
  expect(childrenAfterInitialize).toMatchObject([
    { value: 'a' }
  ])
})

it('do not repopulate deleted thought', async () => {

  fakeTimer.useFakeTimer()

  store.dispatch([
    { type: 'newThought', value: '' },
    {
      type: 'existingThoughtDelete',
      context: [HOME_TOKEN],
      thoughtRanked: { value: '', rank: 0 },
    },
    // Need to setCursor to trigger the pullQueue
    // Must set cursor manually since existingThoughtDelete does not.
    // (The cursor is normally set after deleting via the deleteThought reducer).
    setCursor({ path: null })
  ])

  await fakeTimer.runAllAsync()

  const parentEntryRoot = getParent(store.getState(), [HOME_TOKEN])
  expect(parentEntryRoot).toBe(undefined)

  const parentEntryChild = getParent(store.getState(), [''])
  expect(parentEntryChild).toBe(undefined)
})

it('load buffered thoughts', async () => {

  fakeTimer.useFakeTimer()

  store.dispatch(importText({
    path: HOME_PATH,
    text: `
      - a
        - b
          - c
            - d
              - e`
  }))

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  expect(await getContext(db, [HOME_TOKEN])).toMatchObject({ children: [{ value: 'a' }] })
  expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'b' }] })
  expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
  expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeUndefined()

  // clear state
  // call initialize again to reload from db (simulating page refresh)

  fakeTimer.useFakeTimer()
  store.dispatch(clear())
  await fakeTimer.runAllAsync()

  initialize()
  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  const state = store.getState()
  expect(getAllChildren(state, [HOME_TOKEN])).toMatchObject([{ value: 'a' }])
  expect(getAllChildren(state, ['a'])).toMatchObject([{ value: 'b' }])
  expect(getAllChildren(state, ['a', 'b'])).toMatchObject([{ value: 'c' }])
  expect(getAllChildren(state, ['a', 'b', 'c'])).toMatchObject([{ value: 'd' }])
  expect(getAllChildren(state, ['a', 'b', 'c', 'd'])).toMatchObject([{ value: 'e' }])
  expect(getAllChildren(state, ['a', 'b', 'c', 'd', 'e'])).toMatchObject([])
})

it('delete thought with buffered descendants', async () => {

  fakeTimer.useFakeTimer()

  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - x
        - a
          - b
            - c
              - d
                - e
    ` }),
    setCursorFirstMatchActionCreator(['x']),
  ])

  await fakeTimer.runAllAsync()

  fakeTimer.runAllAsync()

  expect(await getContext(db, [HOME_TOKEN])).toMatchObject({ children: [{ value: 'x' }, { value: 'a' }] })
  expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'b' }] })
  expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
  expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeUndefined()

  fakeTimer.useFakeTimer()
  // clear and call initialize again to reload from db (simulating page refresh)
  store.dispatch(clear())
  await fakeTimer.runAllAsync()
  initialize()
  await fakeTimer.runAllAsync()

  // delete thought with buffered descendants
  store.dispatch(existingThoughtDelete({
    context: [HOME_TOKEN],
    thoughtRanked: { value: 'a', rank: 1 }
  }))
  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  expect(getAllChildren(store.getState(), [HOME_TOKEN])).toMatchObject([{ value: 'x' }])

  expect(await getContext(db, [HOME_TOKEN])).toMatchObject({ children: [{ value: 'x' }] })
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
      path: HOME_PATH,
      text: `
        - x
        - a
          - m
          - b
            - c
              - d
                - e
    ` }),
    setCursorFirstMatchActionCreator(['x']),
  ])

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  expect(await getContext(db, [HOME_TOKEN])).toMatchObject({ children: [{ value: 'x' }, { value: 'a' }] })
  expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'm' }, { value: 'b' }] })
  expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
  expect(await getContext(db, ['a', 'm'])).toBeUndefined()
  expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeUndefined()

  // clear and call initialize again to reload from db (simulating page refresh)
  fakeTimer.useFakeTimer()

  store.dispatch(clear())
  await fakeTimer.runAllAsync()

  initialize()
  await fakeTimer.runAllAsync()

  // delete thought with buffered descendants
  const aPath = rankThoughtsFirstMatch(store.getState(), ['a'])
  const xPath = rankThoughtsFirstMatch(store.getState(), ['x'])
  store.dispatch(existingThoughtMove({
    oldPath: aPath,
    newPath: [...xPath, ...aPath],
  }))

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  expect(getAllChildren(store.getState(), [HOME_TOKEN])).toMatchObject([{ value: 'x' }])

  expect(await getContext(db, [HOME_TOKEN])).toMatchObject({ children: [{ value: 'x' }] })
  expect(await getContext(db, ['a'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()

  expect(await getContext(db, ['x'])).toMatchObject({ children: [{ value: 'a' }] })
  expect(await getContext(db, ['x', 'a'])).toMatchObject({ children: [{ value: 'm' }, { value: 'b' }] })
  expect(await getContext(db, ['x', 'a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
  expect(await getContext(db, ['x', 'a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
  expect(await getContext(db, ['x', 'a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
  expect(await getContext(db, ['x', 'a', 'b', 'c', 'd', 'e'])).toBeUndefined()

})

it('edit thought with buffered descendants', async () => {

  fakeTimer.useFakeTimer()

  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - x
        - a
          - m
          - b
            - c
              - d
                - e
    ` }),
    setCursorFirstMatchActionCreator(['x']),
  ])

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  expect(await getContext(db, [HOME_TOKEN])).toMatchObject({ children: [{ value: 'x' }, { value: 'a' }] })
  expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'm' }, { value: 'b' }] })
  expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
  expect(await getContext(db, ['a', 'm'])).toBeUndefined()
  expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeUndefined()

  fakeTimer.useFakeTimer()

  // clear and call initialize again to reload from db (simulating page refresh)
  store.dispatch(clear())
  await fakeTimer.runAllAsync()

  initialize()
  await fakeTimer.runAllAsync()

  // delete thought with buffered descendants
  store.dispatch(existingThoughtChange({
    oldValue: 'a',
    newValue: 'a!',
    context: [HOME_TOKEN],
    path: [{ value: 'a', rank: 1 }] as SimplePath,
  }))

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  expect(getAllChildren(store.getState(), [HOME_TOKEN])).toMatchObject([{ value: 'x' }, { value: 'a!' }])

  expect(await getContext(db, [HOME_TOKEN])).toMatchObject({ children: [{ value: 'x' }, { value: 'a!' }] })
  expect(await getContext(db, ['a'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()

  expect(await getContext(db, ['a!'])).toMatchObject({ children: [{ value: 'm' }, { value: 'b' }] })
  expect(await getContext(db, ['a!', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
  expect(await getContext(db, ['a!', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
  expect(await getContext(db, ['a!', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
  expect(await getContext(db, ['a!', 'b', 'c', 'd', 'e'])).toBeUndefined()

})

it.only('export thought with buffered descendants', async () => {

  fakeTimer.useFakeTimer()

  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - x
        - a
          - b
            - c
              - d
                - e
    ` }),
    setCursorFirstMatchActionCreator(['x']),
  ])

  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  expect(await getContext(db, [HOME_TOKEN])).toMatchObject({ children: [{ value: 'x' }, { value: 'a' }] })
  expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'b' }] })
  expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
  expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeUndefined()

  // clear and call initialize again to reload from db (simulating page refresh)

  fakeTimer.useFakeTimer()

  store.dispatch(clear())
  await fakeTimer.runAllAsync()

  initialize()
  await fakeTimer.runAllAsync()

  // delete thought with buffered descendants
  store.dispatch(existingThoughtDelete({
    context: [HOME_TOKEN],
    thoughtRanked: { value: 'a', rank: 1 }
  }))

  await fakeTimer.runAllAsync()

  // wait until thoughts are buffered in and then deleted in a separate existingThoughtDelete call
  // existingThoughtDelete -> pushQueue -> thoughtCache -> existingThoughtDelete

  fakeTimer.useRealTimer()

  expect(getAllChildren(store.getState(), [HOME_TOKEN])).toMatchObject([{ value: 'x' }])

  expect(await getContext(db, [HOME_TOKEN])).toMatchObject({ children: [{ value: 'x' }] })
  expect(await getContext(db, ['a'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
  expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()
})
