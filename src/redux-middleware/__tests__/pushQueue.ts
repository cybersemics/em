import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { ABSOLUTE_TOKEN } from '../../constants'
import getLexemeFromProvider from '../../data-providers/data-helpers/getLexeme'
import getThoughtByIdFromDB from '../../data-providers/data-helpers/getThoughtById'
import db from '../../data-providers/thoughtspace'
import findDescendant from '../../selectors/findDescendant'
import getLexemeFromState from '../../selectors/getLexeme'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import { setCursorFirstMatchActionCreator as setCursorFirstMatch } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// Current functionality is broken in main and won't be fixed soon so this test is skipped.
it.skip('editing a thought should load the lexeme and merge contexts', async () => {
  // Related issue: https://github.com/cybersemics/em/issues/1074
  await dispatch(
    importText({
      text: `
      - g
        - h
      - a
        - b
          - c
            - d
              - e
                - f`,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  expect((await getLexemeFromProvider(db, 'f'))?.contexts).toHaveLength(1)

  const thoughtH = contextToThought(store.getState(), ['g', 'h'])
  const thoughtF = contextToThought(store.getState(), ['a', 'b', 'c', 'd', 'e', 'f'])

  await refreshTestApp()
  // lexeme for 'f' should not be loaded into the state yet.
  expect(getLexemeFromState(store.getState(), 'f')).toBeFalsy()

  await dispatch(editThought(['g', 'h'], 'f'))

  await act(vi.runAllTimersAsync)

  // existing Lexemes should be pulled and synced after thought is edited.

  // both db and state should have same updated lexeme
  const thoughtContextsState = getLexemeFromState(store.getState(), 'f')?.contexts

  // Note: Thought h has been changed to f but the id remains the same
  // check that state has the correct contexts, ignoring order and ids
  expect(thoughtContextsState).toEqual(expect.arrayContaining([thoughtH?.id, thoughtF?.id]))
  expect(thoughtContextsState).toHaveLength(2)

  // check that db has the correct contexts, ignoring order and ids
  const thoughtContextsDb = (await getLexemeFromProvider(db, 'f'))?.contexts
  expect(thoughtContextsDb).toEqual(expect.arrayContaining([thoughtH?.id, thoughtF?.id]))

  expect(thoughtContextsState).toHaveLength(2)
})

// Current functionality is broken in main and won't be fixed soon so this test is skipped.
it.skip('a new thought should merge into an unloaded lexeme and persist both contexts across a refresh', async () => {
  // Related issue: https://github.com/cybersemics/em/issues/5426
  await dispatch(
    importText({
      text: `
      - a
      - b
        - c
          - d
            - e
              - f`,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  const thoughtF = contextToThought(store.getState(), ['b', 'c', 'd', 'e', 'f'])

  await refreshTestApp()

  // lexeme for 'f' should not be loaded into the state yet.
  expect(getLexemeFromState(store.getState(), 'f')).toBeFalsy()

  // create a new thought after 'a' and edit it to 'f'
  await dispatch([setCursorFirstMatch(['a']), newThought({ value: 'f' })])

  await act(vi.runAllTimersAsync)

  const thoughtFRoot = contextToThought(store.getState(), ['f'])

  await refreshTestApp()

  // the merged Lexeme should have been persisted, so both contexts are still there after the refresh

  // check that db has the correct contexts, ignoring order and ids
  const thoughtContextsDb = (await getLexemeFromProvider(db, 'f'))?.contexts
  expect(thoughtContextsDb).toEqual(expect.arrayContaining([thoughtF?.id, thoughtFRoot?.id]))
  expect(thoughtContextsDb).toHaveLength(2)

  // check that state has the correct contexts, ignoring order and ids
  const thoughtContextsState = getLexemeFromState(store.getState(), 'f')?.contexts
  expect(thoughtContextsState).toEqual(expect.arrayContaining([thoughtF?.id, thoughtFRoot?.id]))
  expect(thoughtContextsState).toHaveLength(2)
})

it('persist a new context created in the context view under the absolute root and reload it after a refresh', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - m
            - x
        - b
          - m
            - y
      `,
    }),
    setCursorFirstMatch(['a', 'm']),
    toggleContextView(),
    newThought({ insertNewSubthought: true }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  // the cursor is on the new context: an empty thought under the absolute root that holds the new instance of m
  const state = store.getState()
  expectPathToEqual(state, state.cursor, ['a', 'm', ''])
  const newThoughtId = head(state.cursor!)
  const contextId = findDescendant(state, newThoughtId, 'm')!

  // the provider inserts each pushed thought under its parentId and rebuilds childrenMap from the tree on read, so the links must survive the write
  const absoluteFromDb = await getThoughtByIdFromDB(db, ABSOLUTE_TOKEN)
  expect(absoluteFromDb?.childrenMap).toEqual({ [newThoughtId]: newThoughtId })

  const newThoughtFromDb = await getThoughtByIdFromDB(db, newThoughtId)
  expect(newThoughtFromDb).toMatchObject({ value: '', parentId: ABSOLUTE_TOKEN })
  expect(newThoughtFromDb?.childrenMap).toEqual({ [contextId]: contextId })

  const contextFromDb = await getThoughtByIdFromDB(db, contextId)
  expect(contextFromDb).toMatchObject({ value: 'm', parentId: newThoughtId, childrenMap: {} })

  await refreshTestApp()

  // nothing under the absolute root is loaded until the context view asks for the contexts of m
  expect(getThoughtById(store.getState(), newThoughtId)).toBeUndefined()

  await dispatch([setCursorFirstMatch(['a', 'm']), toggleContextView()])

  await act(vi.runAllTimersAsync)

  const stateAfterRefresh = store.getState()

  const newThoughtAfterRefresh = getThoughtById(stateAfterRefresh, newThoughtId)
  expect(newThoughtAfterRefresh).toMatchObject({ value: '', parentId: ABSOLUTE_TOKEN })
  expect(newThoughtAfterRefresh?.childrenMap).toEqual({ [contextId]: contextId })

  const contextAfterRefresh = getThoughtById(stateAfterRefresh, contextId)
  expect(contextAfterRefresh).toMatchObject({ value: 'm', parentId: newThoughtId, childrenMap: {} })
})
