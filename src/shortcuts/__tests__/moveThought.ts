import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { store as appStore } from '../../store'
import testTimer from '../../test-helpers/testTimer'
import { initialize } from '../../initialize'
import clear from '../../action-creators/clear'
import importTextAction from '../../action-creators/importText'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

import { moveThoughtAtFirstMatchActionCreator } from '../../test-helpers/moveThoughtAtFirstMatch'
import { cleanupTestApp } from '../../test-helpers/createTestApp'

const timer = testTimer()

// Note: Since we are using intialize for these tests, we need to make sure to cleanup dbs, storage and window location.
afterEach(async () => await cleanupTestApp())

it('merge up to pending destination descendant', async () => {
  timer.useFakeTimer()
  initialize()
  await timer.runAllAsync()

  const text = `
  - a
    - b
      -c
        - one
        - two
  - d
    - b
      - c
        - three
        - four`

  appStore.dispatch(importTextAction({ text }))
  await timer.runAllAsync()

  timer.useFakeTimer()

  // clear and call initialize again to reload from local db (simulating page refresh)
  appStore.dispatch(clear())
  await timer.runAllAsync()

  initialize()

  await timer.runAllAsync()

  appStore.dispatch([setCursorFirstMatchActionCreator(['a'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  timer.useFakeTimer()

  appStore.dispatch([
    moveThoughtAtFirstMatchActionCreator({
      from: ['a', 'b'],
      to: ['d', 'b'],
      newRank: 1,
    }),
  ])

  await timer.runAllAsync()

  timer.useRealTimer()

  const exported = exportContext(appStore.getState(), [HOME_TOKEN], 'text/plain')

  // three and four are still pending
  const expected = `- ${HOME_TOKEN}
  - a
  - d
    - b
    - b
      - c
        - one
        - two`

  expect(exported).toBe(expected)
})
