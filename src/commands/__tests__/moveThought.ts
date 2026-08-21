import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import appStore from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { moveThoughtAtFirstMatchActionCreator } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('merge up to pending destination descendant', async () => {
  await dispatch(
    importText({
      text: `
    - a
      - b
        - c
          - one
          - two
    - d
      - b
        - c
          - three
          - four
  `,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  // clear and initialize again to reload from local db (simulating page refresh)
  await refreshTestApp()

  await dispatch(setCursor(['a']))

  // wait for the pull queue to load the thoughts within the buffer depth
  await act(vi.runOnlyPendingTimersAsync)

  // the move must run while the destination's descendants are still pending
  expect(contextToThought(appStore.getState(), ['d', 'b'])).toMatchObject({ pending: true })

  await dispatch(
    moveThoughtAtFirstMatchActionCreator({
      from: ['a', 'b'],
      to: ['d', 'b'],
      newRank: 1,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

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
