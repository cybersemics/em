import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import cursorBackTableCommand from '../cursorBackTable'

beforeEach(initStore)

describe('cursorBackTable', () => {
  it('moves the cursor from a col2 thought to its col1 parent with the caret at the end', () => {
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
      setCursor(['a', 'b', 'c']),
    ])

    cursorBackTableCommand.exec(store.dispatch, store.getState, {} as never, { type: 'keyboard' })

    const state = store.getState()
    expect(state.cursor && headValue(state, state.cursor)).toBe('b')
    // the caret should land at the end of the col1 thought
    expect(state.cursorOffset).toBe('b'.length)
  })
})
