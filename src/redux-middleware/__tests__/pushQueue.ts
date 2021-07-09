import { store } from '../../store'
import { importText, editThought } from '../../action-creators'
import { getLexeme as getThoughtSelector } from '../../selectors'
import * as dexie from '../../data-providers/dexie'
import getLexeme from '../../data-providers/data-helpers/getLexeme'
import { DataProvider } from '../../data-providers/DataProvider'
import testTimer from '../../test-helpers/testTimer'
import { SimplePath } from '../../types'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'

/*
  Note: sinon js fake timer is used to overcome some short comming we have with jest's fake timer.
  For details: https://github.com/cybersemics/em/issues/919#issuecomment-739135971
*/

const fakeTimer = testTimer()

const db = dexie as DataProvider

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('editing thoughts to new value with related pending lexeme', async () => {
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

  expect((await getLexeme(db, 'f'))?.contexts).toHaveLength(1)

  // refresh test app
  await refreshTestApp()

  fakeTimer.useFakeTimer()

  // lexeme for 'f; should not be loaded into the state yet.
  expect(getThoughtSelector(store.getState(), 'f')).toBeFalsy()

  store.dispatch(
    editThought({
      oldValue: 'h',
      newValue: 'f',
      context: ['g'],
      path: [
        { value: 'g', rank: 0 },
        { value: 'h', rank: 0 },
      ] as SimplePath,
    }),
  )
  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  // related lexemes should be pulled and synced after thought is edited.

  // both db and state should have same updated lexeme
  const expectedContexts = [{ context: ['g'] }, { context: ['a', 'b', 'c', 'd', 'e'] }]

  expect(getThoughtSelector(store.getState(), 'f')?.contexts).toMatchObject(expectedContexts)

  expect((await getLexeme(db, 'f'))?.contexts).toMatchObject(expectedContexts)
})
