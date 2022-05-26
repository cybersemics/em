import { HOME_TOKEN } from '../../constants'
import { contextToThought, exportContext, isPending } from '../../selectors'
import { store as appStore } from '../../store'
import testTimer from '../../test-helpers/testTimer'
import { initialize } from '../../initialize'
import { clear, importText as importTextAction } from '../../action-creators'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

import { moveThoughtAtFirstMatchActionCreator } from '../../test-helpers/moveThoughtAtFirstMatch'
import { cleanupTestApp } from '../../test-helpers/createTestApp'

const timer = testTimer()

// Note: Since we are using intialize for these tests, we need to make sure to cleanup dbs, storage and window location.
afterEach(async () => await cleanupTestApp())

it('pending destination should be merged correctly (fetch pending before move)', async () => {
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

  const expected = `- ${HOME_TOKEN}
  - a
  - d
    - b
      - c
        - three
        - four
        - one
        - two`

  expect(exported).toBe(expected)
})

it('only fetch the descendants up to the possible conflicting path', async () => {
  timer.useFakeTimer()
  initialize()
  await timer.runAllAsync()
  const text = `
  - a
    - b
      - c
        - 1
        - 2
  - p
    - b
      - c
        - 3
          - 3.1
          - 3.2
            - 3.2.1
        - 4
  - z`

  appStore.dispatch(importTextAction({ text }))
  await timer.runAllAsync()

  timer.useFakeTimer()
  // clear and call initialize again to reload from local db (simulating page refresh)
  appStore.dispatch(clear())
  await timer.runAllAsync()

  initialize()

  await timer.runAllAsync()

  const id = contextToThought(appStore.getState(), ['p', 'b'])
  expect(isPending(appStore.getState(), id)).toEqual(true)
  appStore.dispatch([setCursorFirstMatchActionCreator(['a'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  appStore.dispatch([
    moveThoughtAtFirstMatchActionCreator({
      from: ['a', 'b'],
      to: ['p', 'b'],
      newRank: 1,
    }),
  ])

  await timer.runAllAsync()

  timer.useRealTimer()

  const idPB = contextToThought(appStore.getState(), ['p', 'b'])
  const idPBC3 = contextToThought(appStore.getState(), ['p', 'b', 'c', '3'])
  expect(isPending(appStore.getState(), idPB)).toEqual(false)
  expect(isPending(appStore.getState(), idPBC3)).toEqual(true)
})
