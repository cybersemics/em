import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand } from '../../commands'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import selectAllCommand from '../selectAll'

beforeEach(initStore)

// https://github.com/cybersemics/em/issues/5228
it.skip('deselects all thoughts when Select All is executed while all thoughts are selected', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
      `,
    }),
    setCursor(['b']),
  ])

  executeCommand(selectAllCommand, { store, type: 'keyboard' })
  executeCommand(selectAllCommand, { store, type: 'keyboard' })

  expect(hasMulticursor(store.getState())).toBe(false)
})
