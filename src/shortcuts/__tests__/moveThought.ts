import { clearActionCreator as clear } from '../../actions/clear'
import { importTextActionCreator as importTextAction } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import exportContext from '../../selectors/exportContext'
import appStore from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { moveThoughtAtFirstMatchActionCreator } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import testTimer from '../../test-helpers/testTimer'

const timer = testTimer()

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// TODO: TransactionInactiveError: A request was placed against a transaction which is currently not active, or which is finished.
it.skip('merge up to pending destination descendant', async () => {
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
          - four
  `

  appStore.dispatch(importTextAction({ text }))
  await timer.runAllAsync()

  timer.useFakeTimer()

  // clear and call initialize again to reload from local db (simulating page refresh)
  appStore.dispatch(clear())
  await timer.runAllAsync()

  initialize()

  await timer.runAllAsync()

  appStore.dispatch([setCursor(['a'])])

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
