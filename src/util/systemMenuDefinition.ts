import _ from 'lodash'
import Command from '../@types/Command'
import Key from '../@types/Key'

/** The named values of KeyboardEvent.key that a Tauri accelerator accepts, mapped to the accelerator's name for them. A space is the only one whose name differs. */
const NAMED_KEYS: Record<string, string> = {
  ' ': 'Space',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  Backspace: 'Backspace',
  Delete: 'Delete',
  End: 'End',
  Enter: 'Enter',
  Escape: 'Escape',
  Home: 'Home',
  PageDown: 'PageDown',
  PageUp: 'PageUp',
  Tab: 'Tab',
  ...Object.fromEntries(Array.from({ length: 24 }, (_value, i) => [`F${i + 1}`, `F${i + 1}`])),
}

/** The punctuation characters that a Tauri accelerator accepts as they are. Accelerators name physical keys, so a character typed with Shift, such as `?`, has no accelerator of its own. */
const PUNCTUATION = "`\\[],=-.';/"

/** The accelerators of the native items that desktop/src/menu.rs adds, as toAccelerator writes them: Hide, Hide Others, Quit, Close Window, Undo, Redo, Cut, Copy, Paste, Select All, Enter Full Screen, and Minimize. A command item with one of them would show the shortcut twice, and a shortcut that the page leaves unhandled could reach only one of the two items. */
const NATIVE_ACCELERATORS = [
  'Cmd+H',
  'Cmd+Alt+H',
  'Cmd+Q',
  'Cmd+W',
  'Cmd+Z',
  'Cmd+Shift+Z',
  'Cmd+X',
  'Cmd+C',
  'Cmd+V',
  'Cmd+A',
  'Cmd+Ctrl+F',
  'Cmd+M',
]

/**
 * Converts a keyboard shortcut to the accelerator of a macOS menu item, e.g. `{ key: 'p', meta: true, alt: true }` to
 * `Cmd+Alt+P`. Returns undefined for a shortcut without Command, Control, or Option. A menu accelerator on a bare or
 * Shift-only key, such as Enter, Space, Tab, or Escape, would take that key from the page whenever the page did not
 * handle it, which would interfere with typing.
 */
const toAccelerator = (command: Command, keyboard: Key): string | undefined => {
  if (!keyboard.meta && !keyboard.control && !keyboard.alt) return undefined

  const key =
    NAMED_KEYS[keyboard.key] ??
    (/^[a-z0-9]$/i.test(keyboard.key) || PUNCTUATION.includes(keyboard.key) ? keyboard.key.toUpperCase() : undefined)
  if (!key) {
    throw new Error(
      `The keyboard shortcut of ${command.id} uses the key "${keyboard.key}", which has no menu accelerator. Remove its systemMenu, or map the key in systemMenuDefinition.`,
    )
  }

  // Mac only, since the system menu is only installed on macOS: meta is Command and control is Control.
  return [keyboard.meta && 'Cmd', keyboard.alt && 'Alt', keyboard.control && 'Ctrl', keyboard.shift && 'Shift', key]
    .filter(Boolean)
    .join('+')
}

/**
 * Builds the definition of the desktop app's system menu from the commands: the commands that name a systemMenu,
 * grouped by it and sorted by label. Each item has the command's id and label, and the accelerator of the keyboard
 * shortcut that the app displays for it, unless a native item already has that accelerator. The page still runs such
 * a command from its shortcut, since the page sees a key before the menu does. The definition is committed as
 * desktop/menu.json, which desktop/src/menu.rs builds the native menu from. Regenerate it with `yarn tauri:menu`.
 */
const systemMenuDefinition = (commands: Command[]) =>
  _.mapValues(
    _.groupBy(
      commands.filter(command => command.systemMenu),
      command => command.systemMenu,
    ),
    menuCommands =>
      _.sortBy(menuCommands, command => command.label).map(command => {
        // The first shortcut of an array is the one the app displays, unless keyboardDisplay overrides it.
        const keyboard = command.keyboardDisplay ?? [command.keyboard].flat()[0]
        const accelerator = keyboard
          ? toAccelerator(command, typeof keyboard === 'string' ? { key: keyboard } : keyboard)
          : undefined
        return {
          id: command.id,
          label: command.label,
          accelerator: accelerator && !NATIVE_ACCELERATORS.includes(accelerator) ? accelerator : undefined,
          // A check mark shows the toggle state of a command that has no inverse label to show it with. The isActive of a dropdown command only highlights its toolbar button, so it is not a toggle state.
          checkable: !!command.isActive && !command.labelInverse && !command.isDropdownOpen,
        }
      }),
  )

export default systemMenuDefinition
