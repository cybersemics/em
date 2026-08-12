import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import swapParentCommand from '../swapParent'

beforeEach(initStore)

describe('canExecute', () => {
  // https://github.com/cybersemics/em/issues/4866
  it('cannot swap parent of a top-level thought when the Command Center selects the cursor', () => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
    ])

    expect(swapParentCommand.canExecute!(store.getState())).toBe(false)
  })

  // https://github.com/cybersemics/em/issues/4866
  it('can swap parent of a selected subthought when the cursor is on a parent-level thought', () => {
    store.dispatch([
      importText({
        text: `
          - AAA
          - BBB
            - CCC
        `,
      }),
      setCursor(['AAA']),
      addMulticursor(['BBB', 'CCC']),
    ])

    expect(swapParentCommand.canExecute!(store.getState())).toBe(true)
  })
})
