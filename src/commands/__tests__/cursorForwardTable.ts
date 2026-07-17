import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import cursorForwardTableCommand from '../cursorForwardTable'

beforeEach(initStore)

describe('cursorForwardTable', () => {
  it('moves the cursor from a col1 thought to its col2 child', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - =view
              - Table
            - b
              - c
            - d
              - e
        `,
      }),
      setCursor(['a', 'b']),
    ])

    cursorForwardTableCommand.exec(store.dispatch, store.getState, {} as never, { type: 'keyboard' })

    const state = store.getState()
    expect(state.cursor && headValue(state, state.cursor)).toBe('c')
  })
})
