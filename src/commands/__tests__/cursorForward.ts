import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import cursorForwardCommand from '../cursorForward'

beforeEach(initStore)

/** Returns the sorted values of the current multicursor set. */
const multicursorValues = (): (string | undefined)[] => {
  const state = store.getState()
  return Object.values(state.multicursors)
    .map(path => headValue(state, path))
    .sort()
}

describe('cursorForward', () => {
  // https://github.com/cybersemics/em/issues/3527
  it('selects the children of the selected thoughts', () => {
    store.dispatch([
      importText({
        text: `
          - x
            - =children
              - =pin
            - a
              - b
              - c
            - d
              - e
            - f
              - g
        `,
      }),
      setCursor(['x']),
      addMulticursor(['x', 'a']),
      addMulticursor(['x', 'd']),
    ])

    executeCommandWithMulticursor(cursorForwardCommand, { store })

    expect(multicursorValues()).toEqual(['b', 'c', 'e'])
  })
})
