import { act } from 'react'
import Context from '../../@types/Context'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import ThoughtIndices from '../../@types/ThoughtIndices'
import { clearActionCreator as clear } from '../../actions/clear'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { EM_TOKEN, HOME_TOKEN } from '../../constants'
import { thoughtspaceRuntime } from '../../data-providers/thoughtspace'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'
import { deleteThoughtAtFirstMatchActionCreator } from '../../test-helpers/deleteThoughtAtFirstMatch'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import getAllChildrenByContext from '../../test-helpers/getAllChildrenByContext'
import { moveThoughtAtFirstMatchActionCreator } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import hashThought from '../../util/hashThought'
import isRoot from '../../util/isRoot'

/** Resolves normalized values against one runtime snapshot, independently of Redux and context-view state. */
const getContext = ({ thoughtIndex, lexemeIndex }: ThoughtIndices, context: Context): Thought | undefined => {
  if (!context.length) return undefined
  if (isRoot(context)) return thoughtIndex[context[0] as ThoughtId]
  const root = context[0] === EM_TOKEN ? EM_TOKEN : HOME_TOKEN
  return (root === EM_TOKEN ? context.slice(1) : context).reduce<Thought | undefined>(
    (parent, value) =>
      parent
        ? lexemeIndex[hashThought(value)]?.contexts
            .map(id => thoughtIndex[id])
            .find(thought => thought?.parentId === parent.id)
        : undefined,
    thoughtIndex[root],
  )
}

/** Matches a context's children using a single canonical runtime snapshot. */
const matchContextsChildren = (context: Context, children: Partial<Thought>[]) => {
  const thoughts = thoughtspaceRuntime.project()
  const parentThought = getContext(thoughts, context)
  expect(parentThought).toBeDefined()
  const childrenThoughts = Object.values(parentThought!.childrenMap).map(id => thoughts.thoughtIndex[id])
  expect(childrenThoughts).toMatchObject(children)
}

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('disables isLoading after initialize', async () => {
  expect(store.getState().isLoading).toBe(false)
})

it('explicit clearing deletes the document and stays deleted after reinitialization', async () => {
  await dispatch(importText({ text: '- a\n  - b\n    - c' }))
  await dispatch(clear({ local: true, remote: true }))

  expect(getAllChildrenByContext(store.getState(), [HOME_TOKEN])).toEqual([])
  expect(contextToThought(store.getState(), ['a'])).toBeUndefined()

  await refreshTestApp()

  expect(getAllChildrenByContext(store.getState(), [HOME_TOKEN])).toEqual([])
  expect(contextToThought(store.getState(), ['a', 'b', 'c'])).toBeUndefined()
})

it('clear resets navigation without evicting the complete document', async () => {
  // create a thought, which will get persisted to local db
  await dispatch(newThought({ value: 'a' }))

  await act(vi.runOnlyPendingTimersAsync)

  const thoughtA = contextToThought(store.getState(), ['a'])!

  const root = getContext(thoughtspaceRuntime.project(), [HOME_TOKEN])
  expect(root).toMatchObject({
    childrenMap: { [thoughtA.id]: thoughtA.id },
  })

  // clear state
  await dispatch(clear())

  expect(store.getState().cursor).toBeNull()
  expect(store.getState().thoughts.thoughtIndex[thoughtA.id]).toEqual(thoughtA)
  expect(store.getState().isLoading).toBe(false)

  // Confirm the canonical document is unchanged after resetting the UI.
  const rootAfterReload = getContext(thoughtspaceRuntime.project(), [HOME_TOKEN])
  expect(rootAfterReload).toMatchObject({
    childrenMap: { [thoughtA.id]: thoughtA.id },
  })

  await refreshTestApp()

  const childrenAfterInitialize = getAllChildrenByContext(store.getState(), [HOME_TOKEN])
  expect(childrenAfterInitialize).toMatchObject([thoughtA?.id])
})

it('do not repopulate deleted thought', async () => {
  await dispatch([
    newThought({}),
    deleteThoughtAtFirstMatchActionCreator(['']),
    // Must set cursor manually since deleteThought does not.
    // (The cursor is normally set after deleting via the deleteThoughtWithCursor reducer).
    setCursor(null),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const root = contextToThought(store.getState(), [HOME_TOKEN])
  expect(root).toMatchObject({
    childrenMap: {},
  })

  const parentEntryChild = contextToThought(store.getState(), [''])
  expect(parentEntryChild).toBe(undefined)
})

it('publishes every descendant before initialization completes', async () => {
  await dispatch(
    importText({
      text: `
      - a
        - b
          - c
            - d
              - e`,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  const thoughtA = contextToThought(store.getState(), ['a'])!
  const thoughtB = contextToThought(store.getState(), ['a', 'b'])!
  const thoughtC = contextToThought(store.getState(), ['a', 'b', 'c'])!
  const thoughtD = contextToThought(store.getState(), ['a', 'b', 'c', 'd'])!
  const thoughtE = contextToThought(store.getState(), ['a', 'b', 'c', 'd', 'e'])!

  matchContextsChildren([HOME_TOKEN], [{ value: 'a' }])
  matchContextsChildren(['a'], [{ value: 'b' }])
  matchContextsChildren(['a', 'b'], [{ value: 'c' }])
  matchContextsChildren(['a', 'b', 'c'], [{ value: 'd' }])
  matchContextsChildren(['a', 'b', 'c', 'd'], [{ value: 'e' }])
  matchContextsChildren(['a', 'b', 'c', 'd', 'e'], [])

  // clear state
  // call initialize again to reload from db (simulating page refresh)

  await refreshTestApp()

  const state = store.getState()
  expect(getAllChildrenByContext(state, [HOME_TOKEN])).toMatchObject([thoughtA.id])
  expect(getAllChildrenByContext(state, ['a'])).toMatchObject([thoughtB.id])
  expect(getAllChildrenByContext(state, ['a', 'b'])).toMatchObject([thoughtC.id])
  expect(getAllChildrenByContext(state, ['a', 'b', 'c'])).toMatchObject([thoughtD.id])
  expect(getAllChildrenByContext(state, ['a', 'b', 'c', 'd'])).toMatchObject([thoughtE.id])
  expect(getAllChildrenByContext(state, ['a', 'b', 'c', 'd', 'e'])).toMatchObject([])
})

it('deletes an entire deep subtree after reinitialization', async () => {
  await dispatch([
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
    setCursor(['x']),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  matchContextsChildren([HOME_TOKEN], [{ value: 'x' }, { value: 'a' }])
  matchContextsChildren(['a'], [{ value: 'b' }])
  matchContextsChildren(['a', 'b'], [{ value: 'c' }])
  matchContextsChildren(['a', 'b', 'c'], [{ value: 'd' }])
  matchContextsChildren(['a', 'b', 'c', 'd'], [{ value: 'e' }])
  matchContextsChildren(['a', 'b', 'c', 'd', 'e'], [])

  await refreshTestApp()

  // Delete without navigating into the deep subtree.
  await dispatch(deleteThoughtAtFirstMatchActionCreator(['a']))
  await act(vi.runAllTimersAsync)

  matchContextsChildren([HOME_TOKEN], [{ value: 'x' }])
  expect(getContext(thoughtspaceRuntime.project(), ['a'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b', 'c'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b', 'c', 'd'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()
})

it('moves an entire deep subtree after reinitialization', async () => {
  await dispatch([
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
    setCursor(['x']),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const thoughtX = contextToThought(store.getState(), ['x'])!
  const thoughtA = contextToThought(store.getState(), ['a'])!
  const thoughtM = contextToThought(store.getState(), ['a', 'm'])!
  const thoughtB = contextToThought(store.getState(), ['a', 'b'])!
  const thoughtC = contextToThought(store.getState(), ['a', 'b', 'c'])!
  const thoughtD = contextToThought(store.getState(), ['a', 'b', 'c', 'd'])!
  const thoughtE = contextToThought(store.getState(), ['a', 'b', 'c', 'd', 'e'])!

  expect(thoughtspaceRuntime.project().thoughtIndex[HOME_TOKEN]).toMatchObject({
    childrenMap: { [thoughtX.id]: thoughtX.id, [thoughtA.id]: thoughtA.id },
  })
  expect(thoughtspaceRuntime.project().thoughtIndex[thoughtA.id]).toMatchObject({
    childrenMap: { [thoughtM.id]: thoughtM.id, [thoughtB.id]: thoughtB.id },
  })
  expect(thoughtspaceRuntime.project().thoughtIndex[thoughtB.id]).toMatchObject({
    childrenMap: { [thoughtC.id]: thoughtC.id },
  })
  expect(thoughtspaceRuntime.project().thoughtIndex[thoughtM.id]).toMatchObject({ childrenMap: {} })
  expect(thoughtspaceRuntime.project().thoughtIndex[thoughtC.id]).toMatchObject({
    childrenMap: { [thoughtD.id]: thoughtD.id },
  })
  expect(thoughtspaceRuntime.project().thoughtIndex[thoughtD.id]).toMatchObject({
    childrenMap: { [thoughtE.id]: thoughtE.id },
  })
  expect(thoughtspaceRuntime.project().thoughtIndex[thoughtE.id]).toMatchObject({ childrenMap: {} })

  await refreshTestApp()

  // Move without navigating into the deep subtree.
  await dispatch(
    moveThoughtAtFirstMatchActionCreator({
      from: ['a'],
      to: ['x', 'a'],
      after: null,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  matchContextsChildren([HOME_TOKEN], [{ value: 'x' }])
  expect(getContext(thoughtspaceRuntime.project(), ['a'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b', 'c'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b', 'c', 'd'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()

  matchContextsChildren(['x'], [{ value: 'a' }])
  matchContextsChildren(['x', 'a'], [{ value: 'm' }, { value: 'b' }])
  matchContextsChildren(['x', 'a', 'b'], [{ value: 'c' }])
  matchContextsChildren(['x', 'a', 'b', 'c'], [{ value: 'd' }])
  matchContextsChildren(['x', 'a', 'b', 'c', 'd'], [{ value: 'e' }])
  matchContextsChildren(['x', 'a', 'b', 'c', 'd', 'e'], [])
})

it('edits a deep subtree root after reinitialization', async () => {
  await dispatch([
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
    setCursor(['x']),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  matchContextsChildren([HOME_TOKEN], [{ value: 'x' }, { value: 'a' }])
  matchContextsChildren(['a'], [{ value: 'm' }, { value: 'b' }])
  matchContextsChildren(['a', 'b'], [{ value: 'c' }])
  matchContextsChildren(['a', 'm'], [])
  matchContextsChildren(['a', 'b', 'c'], [{ value: 'd' }])
  matchContextsChildren(['a', 'b', 'c', 'd'], [{ value: 'e' }])
  matchContextsChildren(['a', 'b', 'c', 'd', 'e'], [])

  await refreshTestApp()

  // Edit without navigating into the deep subtree.
  await dispatch(editThought(['a'], 'k'))

  await act(vi.runOnlyPendingTimersAsync)

  matchContextsChildren([HOME_TOKEN], [{ value: 'x' }, { value: 'k' }])
  await act(vi.runAllTimersAsync)

  expect(getContext(thoughtspaceRuntime.project(), ['a'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b', 'c'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b', 'c', 'd'])).toBeFalsy()
  expect(getContext(thoughtspaceRuntime.project(), ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()

  matchContextsChildren(['k'], [{ value: 'm' }, { value: 'b' }])
  matchContextsChildren(['k!', 'b'], [{ value: 'c' }])
  matchContextsChildren(['k!', 'b', 'c'], [{ value: 'd' }])
  matchContextsChildren(['k!', 'b', 'c', 'd'], [{ value: 'e' }])
  matchContextsChildren(['k!', 'b', 'c', 'd', 'e'], [])
})
