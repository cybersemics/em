import { store } from '../../store'
import { importText, editThought } from '../../action-creators'
import { getLexeme as getLexemeState, contextToThought, contextToPath } from '../../selectors'
import * as dexie from '../../data-providers/dexie'
import getLexemeDb from '../../data-providers/data-helpers/getLexeme'
import { DataProvider } from '../../data-providers/DataProvider'
import testTimer from '../../test-helpers/testTimer'
import { SimplePath } from '../../@types'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'

/*
  Note: sinon js fake timer is used to overcome some short comming we have with jest's fake timer.
  For details: https://github.com/cybersemics/em/issues/919#issuecomment-739135971
*/

const fakeTimer = testTimer()

const db = dexie as DataProvider

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('editing a thought should load the lexeme and merge contexts', async () => {
  // Related issue: https://github.com/cybersemics/em/issues/1074

  fakeTimer.useFakeTimer()

  store.dispatch(
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

  await fakeTimer.runAllAsync()

  await fakeTimer.useRealTimer()

  expect((await getLexemeDb(db, 'f'))?.contexts).toHaveLength(1)

  const thoughtH = contextToThought(store.getState(), ['g', 'h'])
  const thoughtF = contextToThought(store.getState(), ['a', 'b', 'c', 'd', 'e', 'f'])

  // refresh test app
  await refreshTestApp()

  fakeTimer.useFakeTimer()

  // lexeme for 'f' should not be loaded into the state yet.
  expect(getLexemeState(store.getState(), 'f')).toBeFalsy()

  const pathGH = contextToPath(store.getState(), ['g', 'h']) as SimplePath

  store.dispatch(
    editThought({
      oldValue: 'h',
      newValue: 'f',
      context: ['g'],
      path: pathGH,
    }),
  )
  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  // existing Lexemes should be pulled and synced after thought is edited.

  // both db and state should have same updated lexeme
  const thoughtContextsState = getLexemeState(store.getState(), 'f')?.contexts

  // Note: Thought h has been changed to f but the id remains the same
  // check that state has the correct contexts, ignoring order and ids
  expect(thoughtContextsState).toEqual(expect.arrayContaining([thoughtH?.id, thoughtF?.id]))
  expect(thoughtContextsState).toHaveLength(2)

  // check that db has the correct contexts, ignoring order and ids
  const thoughtContextsDb = (await getLexemeDb(db, 'f'))?.contexts
  expect(thoughtContextsDb).toEqual(expect.arrayContaining([thoughtH?.id, thoughtF?.id]))

  expect(thoughtContextsState).toHaveLength(2)
})
