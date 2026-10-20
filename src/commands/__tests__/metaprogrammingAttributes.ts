import CommandId from '../../@types/CommandId'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleHiddenThoughtsActionCreator as toggleHiddenThoughts } from '../../actions/toggleHiddenThoughts'
import { executeCommandWithMulticursor, globalCommands } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import canExecuteCommand from '../../selectors/canExecuteCommand'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import exportContextCommand from '../exportContext'

beforeEach(initStore)

/** The commands that may execute while a metaprogramming attribute is selected: navigation, visibility, app-level, and history. */
const allowedIds: CommandId[] = [
  'cancel',
  'closeCommandCenter',
  'copyCursor',
  'cursorBack',
  'cursorBackTable',
  'cursorDown',
  'cursorForward',
  'cursorForwardTable',
  'cursorNext',
  'cursorPrev',
  'cursorUp',
  'customizeToolbar',
  'devices',
  'fontSizeDown',
  'fontSizeUp',
  'gestureMenu',
  'help',
  'home',
  'jumpBack',
  'jumpForward',
  'navigateBack',
  'navigateForward',
  'openCommandCenter',
  'openDesktopCommandUniverse',
  'openMobileCommandUniverse',
  'redo',
  'repeat',
  'selectAll',
  'selectBetween',
  'settings',
  'toggleHiddenThoughts',
  'toggleSidebar',
  'toggleUndoSlider',
  'undo',
]

const text = `
  - x
    - aaa
      - =favorite
      - =style
        - color
          - tomato
      - bbb
`

const blockedCommands = globalCommands.filter(command => !command.allowOnAttribute)
const allowedCommands = globalCommands.filter(command => command.allowOnAttribute)

it('allows only navigation, visibility, app-level, and history commands on a metaprogramming attribute', () => {
  expect(allowedCommands.map(command => command.id).sort()).toEqual([...allowedIds].sort())
})

// https://github.com/cybersemics/em/issues/6009
describe.each(blockedCommands.map(command => [command.id, command] as const))('%s', (id, command) => {
  it('cannot execute on a metaprogramming attribute', () => {
    store.dispatch([importText({ text }), toggleHiddenThoughts(), setCursor(['x', 'aaa', '=favorite'])])
    expect(canExecuteCommand(store.getState(), command)).toBe(false)
  })

  it('cannot execute on a descendant of a metaprogramming attribute', () => {
    store.dispatch([importText({ text }), toggleHiddenThoughts(), setCursor(['x', 'aaa', '=style', 'color', 'tomato'])])
    expect(canExecuteCommand(store.getState(), command)).toBe(false)
  })

  it('cannot execute on a selection that contains a metaprogramming attribute', () => {
    store.dispatch([
      importText({ text }),
      toggleHiddenThoughts(),
      setCursor(['x', 'aaa', 'bbb']),
      addMulticursor(['x', 'aaa', 'bbb']),
      addMulticursor(['x', 'aaa', '=favorite']),
    ])
    expect(canExecuteCommand(store.getState(), command)).toBe(false)
  })
})

describe.each(allowedCommands.map(command => [command.id, command] as const))('%s', (id, command) => {
  it('is not disabled by a selected metaprogramming attribute', () => {
    store.dispatch([importText({ text }), toggleHiddenThoughts(), setCursor(['x', 'aaa', '=favorite'])])
    const state = store.getState()
    expect(canExecuteCommand(state, command)).toBe(!command.canExecute || command.canExecute(state))
  })
})

it('does not open the export modal from a metaprogramming attribute', () => {
  store.dispatch([importText({ text }), toggleHiddenThoughts(), setCursor(['x', 'aaa', '=favorite'])])

  executeCommandWithMulticursor(exportContextCommand, { store })

  expect(store.getState().showModal).toBeFalsy()
})

it('leaves a metaprogramming attribute unchanged when a blocked command is executed on it', () => {
  store.dispatch([importText({ text }), toggleHiddenThoughts(), setCursor(['x', 'aaa', '=favorite'])])

  blockedCommands.forEach(command => executeCommandWithMulticursor(command, { store }))

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - x
    - aaa
      - =favorite
      - =style
        - color
          - tomato
      - bbb`)
})
