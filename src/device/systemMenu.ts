import { invoke } from '@tauri-apps/api/core'
import { UnlistenFn, listen } from '@tauri-apps/api/event'
import _ from 'lodash'
import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import { commandById, executeCommandWithMulticursor, globalCommands } from '../commands'
import store from '../stores/app'
import { registerReset } from '../stores/ministore'
import systemMenuDefinition from '../util/systemMenuDefinition'

/** How often, at most, the menu items are brought in step with the state, in ms. Every action notifies the store's subscribers, and a menu that lags by a fraction of a second is not noticeable. */
const UPDATE_THROTTLE = 100

/** The state of a command's menu item, as update_system_menu in desktop/src/menu.rs applies it. */
interface ItemState {
  id: CommandId
  enabled: boolean
  text: string
  checked: boolean
}

/** The command items of the system menu, as desktop/menu.json defines them. Built on first use rather than on import, since this module is imported by initEvents, which commands.ts may still be evaluating. */
const menuItems = _.once(() => Object.values(systemMenuDefinition(globalCommands)).flat())

/** The pending registration of the menu event listener, kept so that the listener can be removed on destroy. */
let listener: Promise<UnlistenFn> | null = null

/** Unsubscribes the store subscription that keeps the menu items in step with the state. */
let unsubscribe: (() => void) | null = null

/** The item states last sent to the menu, by command id, so that only the items that changed are sent again. */
const reported = new Map<CommandId, ItemState>()

/**
 * Whether the command can run from the system menu. The conditions are those of its keyboard shortcut (see keyDown in
 * commands.ts). The page sees a shortcut before the menu does, so a shortcut only reaches its menu item when keyDown
 * declined it, and the menu item must not then run what the shortcut would not.
 */
const canExecuteFromMenu = (state: State, command: Command): boolean =>
  !state.showDesktopCommandUniverse &&
  !state.showMobileCommandUniverse &&
  (!state.showModal || !!command.allowExecuteFromModal) &&
  (!command.canExecute || command.canExecute(state))

/** Sends the states of the menu items that changed since they were last sent. Throttled, since it runs on every action. */
const update = _.throttle(() => {
  const state = store.getState()
  const changed = menuItems()
    .map(({ id, checkable }): ItemState => {
      const command = commandById(id)
      const isActive = !!command.isActive?.(state)
      return {
        id,
        enabled: canExecuteFromMenu(state, command),
        text: isActive && command.labelInverse ? command.labelInverse : command.label,
        checked: checkable && isActive,
      }
    })
    .filter(item => !_.isEqual(item, reported.get(item.id)))
  if (changed.length === 0) return

  changed.forEach(item => reported.set(item.id, item))
  invoke('update_system_menu', { items: changed }).catch(error => {
    console.error('Failed to update the system menu', error)
    // Forget the states that did not reach the menu, so that the next update sends them again.
    changed.forEach(item => {
      if (reported.get(item.id) === item) reported.delete(item.id)
    })
  })
}, UPDATE_THROTTLE)

/** Executes the command of the menu item that was chosen. */
const onMenuItem = ({ payload: id }: { payload: CommandId }) => {
  // The menu is compiled from desktop/menu.json, which can name a command that a newer web build no longer has.
  const command = commandById(id) as Command | undefined
  if (!command) return

  // The menu toggles the check mark of a check item itself when it is chosen, so the state last sent for it no longer
  // describes the menu. Forget it, so that the next update sends the command's actual state.
  reported.delete(id)

  if (canExecuteFromMenu(store.getState(), command)) {
    executeCommandWithMulticursor(command, { store, type: 'systemMenu' })
  }
  update()
}

/** Connects the desktop app's system menu, which desktop/src/menu.rs builds from desktop/menu.json, to the commands. */
const systemMenu = {
  /** Executes the command of a menu item when it is chosen, and keeps each item enabled, labeled, and checked as the state of its command requires. */
  init: () => {
    if (listener) return
    listener = listen<CommandId>('system-menu', onMenuItem)
    update()
    unsubscribe = store.subscribe(update)
  },
  /** Removes the menu event listener and the store subscription. Removes the listener once registration resolves, so that a destroy that beats the pending registration still takes effect. */
  destroy: () => {
    listener?.then(unlisten => unlisten())
    listener = null
    unsubscribe?.()
    unsubscribe = null
    update.cancel()
    reported.clear()
  },
}

// Remove the menu event listener and the store subscription at every test boundary. init is idempotent only while they
// are held, so releasing them is what lets the next test init again.
registerReset(systemMenu.destroy)

export default systemMenu
