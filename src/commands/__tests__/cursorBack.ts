import { cursorBackActionCreator as cursorBack } from '../../actions/cursorBack'
import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursor } from '../../actions/setCursor'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'

beforeEach(initStore)

describe('normal view', () => {
  it('moves from note to cursor thought', () => {
    store.dispatch([
      importText({
        text: `
              - a
                - b
                  - =note
                    - Hello world
                  - c
            `,
      }),
      (dispatch, getState) => dispatch(setCursor({ path: contextToPath(getState(), ['a', 'b']), noteFocus: true })),
      cursorBack(),
    ])

    const stateNew = store.getState()
    expectPathToEqual(stateNew, stateNew.cursor, ['a'])
    expect(stateNew.noteFocus).toBeFalse()
  })
})
