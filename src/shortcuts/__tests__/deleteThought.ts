import clear from '../../action-creators/clear'
import deleteThoughtWithCursor from '../../action-creators/deleteThoughtWithCursor'
import importTextAction from '../../action-creators/importText'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import exportContext from '../../selectors/exportContext'
import getThoughtById from '../../selectors/getThoughtById'
import { store as appStore } from '../../store'
import contextToThought from '../../test-helpers/contextToThought'
import { cleanupTestApp } from '../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import testTimer from '../../test-helpers/testTimer'

const timer = testTimer()

// Note: Since we are using intialize for these tests, we need to make sure to cleanup dbs, storage and window location.
afterEach(async () => await cleanupTestApp())

it('delete pending descendants', async () => {
  timer.useFakeTimer()
  initialize()
  await timer.runAllAsync()

  // c will be pending after refresh
  const text = `
  - a
    - b
      -c
        - d
          - e
            - one
            - two
    - x`

  appStore.dispatch(importTextAction({ text }))
  await timer.runAllAsync()

  const state = appStore.getState()
  const thoughtA = contextToThought(state, ['a'])!
  const thoughtB = contextToThought(state, ['a', 'b'])!
  const thoughtC = contextToThought(state, ['a', 'b', 'c'])!
  const thoughtD = contextToThought(state, ['a', 'b', 'c', 'd'])!
  const thoughtE = contextToThought(state, ['a', 'b', 'c', 'd', 'e'])!
  const thoughtOne = contextToThought(state, ['a', 'b', 'c', 'd', 'e', 'one'])!
  const thoughtTwo = contextToThought(state, ['a', 'b', 'c', 'd', 'e', 'two'])!
  const thoughtX = contextToThought(state, ['a', 'x'])!

  expect(thoughtA).toBeTruthy()
  expect(thoughtB).toBeTruthy()
  expect(thoughtC).toBeTruthy()
  expect(thoughtD).toBeTruthy()
  expect(thoughtE).toBeTruthy()
  expect(thoughtOne).toBeTruthy()
  expect(thoughtTwo).toBeTruthy()
  expect(thoughtX).toBeTruthy()

  timer.useFakeTimer()

  // clear and call initialize again to reload from local db (simulating page refresh)
  appStore.dispatch(clear())
  initialize()
  await timer.runAllAsync()

  appStore.dispatch([setCursor(['a'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  const stateAfterRefresh = appStore.getState()

  expect(getThoughtById(stateAfterRefresh, thoughtA.id)).toBeTruthy()
  expect(getThoughtById(stateAfterRefresh, thoughtB.id)).toBeTruthy()
  expect(getThoughtById(stateAfterRefresh, thoughtC.id)).toBeTruthy()
  expect(getThoughtById(stateAfterRefresh, thoughtD.id)).toBeFalsy()
  expect(getThoughtById(stateAfterRefresh, thoughtE.id)).toBeFalsy()
  expect(getThoughtById(stateAfterRefresh, thoughtOne.id)).toBeFalsy()
  expect(getThoughtById(stateAfterRefresh, thoughtTwo.id)).toBeFalsy()
  expect(getThoughtById(stateAfterRefresh, thoughtX.id)).toBeTruthy()

  timer.useFakeTimer()

  appStore.dispatch([deleteThoughtWithCursor({})])

  await timer.runAllAsync()

  timer.useRealTimer()

  const stateNew = appStore.getState()
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  const expected = `- ${HOME_TOKEN}`

  expect(exported).toBe(expected)

  expect(getThoughtById(stateNew, thoughtA.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtB.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtC.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtD.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtE.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtOne.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtTwo.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtX.id)).toBeFalsy()
})
