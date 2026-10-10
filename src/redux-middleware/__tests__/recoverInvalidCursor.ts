import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursorPath } from '../../actions/setCursor'
import { initialize } from '../../initialize'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(initStore)

it('moves an invalid cursor back to the last valid cursor', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({
      text: `
        - g
          - a
            - x
          - b`,
    }),
    setCursor(['g', 'a']),
  ])

  // a path that was valid before x was moved, such as one held by a stale history entry
  const pathBefore = contextToPath(store.getState(), ['g', 'a', 'x'])!

  store.dispatch(moveThought({ from: ['g', 'a', 'x'], to: ['g', 'b', 'x'], newRank: 0 }))

  // set the cursor to x where it was rather than where it is now
  store.dispatch(setCursorPath({ path: pathBefore }))

  const state = store.getState()
  expect(state.cursor).toEqual(contextToPath(state, ['g', 'a']))
})
