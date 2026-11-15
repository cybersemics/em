import { importTextActionCreator as importText } from '../../actions/importText'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { executeCommand } from '../../commands'
import pinCommand from '../../commands/pin'
import toggleTableViewCommand from '../../commands/toggleTableView'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import systemMenu from '../systemMenu'

/** A menu item state, as the module sends it to update_system_menu in desktop/src/menu.rs. */
interface MenuItemState {
  id: string
  enabled: boolean
  text: string
  checked: boolean
}

/** The item states of every update the module sent to the menu, in order. */
const mockUpdates: MenuItemState[][] = []

/** The menu event listener registered by the module, so that the test can choose a menu item. */
let mockChooseMenuItem: ((event: { payload: string }) => void) | null = null

/** Whether the next update that the module sends fails to reach the menu. */
let mockFailNextUpdate = false

vi.mock('@tauri-apps/api/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@tauri-apps/api/core')>()),
  invoke: (command: string, args: { items: MenuItemState[] }) => {
    if (command !== 'update_system_menu') return Promise.resolve()
    if (mockFailNextUpdate) {
      mockFailNextUpdate = false
      return Promise.reject(new Error('The update did not reach the menu.'))
    }
    mockUpdates.push(args.items)
    return Promise.resolve()
  },
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: (event: string, handler: (event: { payload: string }) => void) => {
    if (event === 'system-menu') mockChooseMenuItem = handler
    return Promise.resolve(() => {})
  },
}))

/** The state the menu shows for a command's item: the last state the module sent for it. */
const menuItem = (id: string): Omit<MenuItemState, 'id'> => {
  const item = mockUpdates
    .flat()
    .reverse()
    .find(item => item.id === id)
  if (!item) throw new Error(`No state was sent for the menu item of ${id}.`)
  const { id: _id, ...state } = item
  return state
}

/** Chooses the menu item of a command, as the menu reports it when the user clicks the item. */
const chooseMenuItem = (id: string) => {
  if (!mockChooseMenuItem) throw new Error('The module did not listen for menu events.')
  mockChooseMenuItem({ payload: id })
}

beforeEach(() => {
  mockUpdates.length = 0
  mockChooseMenuItem = null
  mockFailNextUpdate = false
})

beforeEach(initStore)

it('enables the item of a command when the command can execute', async () => {
  store.dispatch(importText({ text: '- a', preventSetCursor: true }))
  systemMenu.init()
  expect(menuItem('pin')).toEqual({ enabled: false, text: 'Pin', checked: false })

  store.dispatch(setCursor(['a']))
  await vi.runAllTimersAsync()

  expect(menuItem('pin')).toEqual({ enabled: true, text: 'Pin', checked: false })
})

it('labels the item of an active command with its inverse label', async () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a'])])
  systemMenu.init()

  executeCommand(pinCommand, { store })
  await vi.runAllTimersAsync()

  expect(menuItem('pin')).toEqual({ enabled: true, text: 'Unpin', checked: false })
})

it('checks the item of an active command that has no inverse label', async () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a'])])
  systemMenu.init()

  executeCommand(toggleTableViewCommand, { store })
  await vi.runAllTimersAsync()

  expect(menuItem('toggleTableView')).toEqual({ enabled: true, text: 'Table View', checked: true })
})

it('disables the items of commands that cannot execute from a modal while a modal is open', async () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a'])])
  systemMenu.init()

  store.dispatch(showModal({ id: 'help' }))
  await vi.runAllTimersAsync()

  expect(menuItem('pin')).toEqual({ enabled: false, text: 'Pin', checked: false })
  expect(menuItem('settings')).toEqual({ enabled: true, text: 'Settings', checked: false })
})

it('executes the command of the chosen menu item', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['a']),
  ])
  systemMenu.init()

  chooseMenuItem('moveThoughtDown')

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - b
  - a`)
})

it('does not execute the command of the chosen menu item while a modal that it cannot execute from is open', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['a']),
    showModal({ id: 'help' }),
  ])
  systemMenu.init()

  chooseMenuItem('moveThoughtDown')

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
})

it('sends the states of an update that failed again with the next update', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  store.dispatch(importText({ text: '- a', preventSetCursor: true }))
  mockFailNextUpdate = true
  systemMenu.init()
  await vi.runAllTimersAsync()

  store.dispatch(setCursor(['a']))
  await vi.runAllTimersAsync()

  // Settings can execute in either state, so only a resend of the failed update sends its state.
  expect(menuItem('settings')).toEqual({ enabled: true, text: 'Settings', checked: false })
  expect(consoleError).toHaveBeenCalled()
  consoleError.mockRestore()
})

// The menu toggles the check mark of a check item when it is chosen. A command that cannot execute leaves the state
// unchanged, so unless the item's state is sent again, the menu keeps the check mark that the click gave it.
it('sends the state of a chosen check item again, even when its command did not change it', async () => {
  store.dispatch(importText({ text: '- a', preventSetCursor: true }))
  systemMenu.init()
  await vi.runAllTimersAsync()
  mockUpdates.length = 0

  chooseMenuItem('toggleTableView')
  await vi.runAllTimersAsync()

  expect(mockUpdates.flat()).toEqual([{ id: 'toggleTableView', enabled: false, text: 'Table View', checked: false }])
})
