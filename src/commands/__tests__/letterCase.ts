import { homeActionCreator as home } from '../../actions/home'
import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import letterCaseCommand from '../letterCase'

beforeEach(initStore)

describe('canExecute', () => {
  // https://github.com/cybersemics/em/issues/4844
  it('can change the letter case of thoughts selected without a cursor', () => {
    store.dispatch([
      importText({
        text: `
          - AAA
          - BBB
          - CCC
        `,
      }),
      home(),
      addMulticursor(['AAA']),
    ])

    const state = store.getState()

    expect(state.cursor).toBeNull()
    expect(letterCaseCommand.canExecute(state)).toBe(true)
    expect(letterCaseCommand.isActive(state)).toBe(true)
  })
})
