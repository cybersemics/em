import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand } from '../../commands'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import multicursorValues from '../../test-helpers/multicursorValues'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { toggleMulticursorAtFirstMatchActionCreator as toggleMulticursor } from '../../test-helpers/toggleMulticursorAtFirstMatch'
import selectAllCommand from '../selectAll'

beforeEach(initStore)

// https://github.com/cybersemics/em/issues/3561
it('selects all thoughts at the cursor depth and clears the deeper selection', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
          - c
        - d
      `,
    }),
    setCursor(['a']),
    toggleMulticursor(['a', 'b']),
    toggleMulticursor(['a', 'c']),
  ])

  executeCommand(selectAllCommand, { store })

  expect(multicursorValues()).toEqual(['a', 'd'])
})

// https://github.com/cybersemics/em/issues/5228
it('deselects all thoughts when Select All is executed while all thoughts are selected', () => {
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
