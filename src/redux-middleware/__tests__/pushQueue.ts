import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import getLexemeFromProvider from '../../data-providers/data-helpers/getLexeme'
import db from '../../data-providers/yjs/thoughtspace'
import getLexemeFromState from '../../selectors/getLexeme'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'

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
