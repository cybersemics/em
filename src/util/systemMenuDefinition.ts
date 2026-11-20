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

/** The accelerators of a menu item on each platform. On macOS, meta is Command and control is Control. On Windows and Linux, meta is Ctrl, and control is Shift, since Ctrl is already meta there (see hashCommand in commands.ts). */
interface Accelerators {
  macos?: string
  windowsLinux?: string
}

/** The accelerators of the native items that desktop/src/menu.rs adds on each platform, as toAccelerators writes them. A command item with one of them would show the shortcut twice, and a shortcut that the page leaves unhandled could reach only one of the two items. */
const NATIVE_ACCELERATORS: Record<keyof Accelerators, string[]> = {
  // Hide, Hide Others, Quit, Close Window, Undo, Redo, Cut, Copy, Paste, Select All, Enter Full Screen, and Minimize.
  macos: [
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
  ],
  // Undo, Redo, Cut, Copy, Paste, and Select All, which only the Windows menu has.
  windowsLinux: ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+A'],
}

/**
 * Converts a keyboard shortcut to the accelerators of a menu item, e.g. `{ key: 'p', meta: true, alt: true }` to
 * `Cmd+Alt+P` on macOS and `Ctrl+Alt+P` on Windows and Linux. A platform gets no accelerator for a shortcut without
 * Command/Ctrl, Control, or Option/Alt there, nor for one that a native item already has. A menu accelerator on a bare
 * or Shift-only key, such as Enter, Space, Tab, or Escape, would take that key from the page whenever the page did not
 * handle it, which would interfere with typing.
 */
const toAccelerators = (command: Command, keyboard: Key): Accelerators | undefined => {
  if (!keyboard.meta && !keyboard.control && !keyboard.alt) return undefined

  const key =
    NAMED_KEYS[keyboard.key] ??
    (/^[a-z0-9]$/i.test(keyboard.key) || PUNCTUATION.includes(keyboard.key) ? keyboard.key.toUpperCase() : undefined)
  if (!key) {
    throw new Error(
      `The keyboard shortcut of ${command.id} uses the key "${keyboard.key}", which has no menu accelerator. Remove its systemMenu, or map the key in systemMenuDefinition.`,
    )
  }

  const modifiers: Record<keyof Accelerators, (string | false | undefined)[]> = {
    macos: [keyboard.meta && 'Cmd', keyboard.alt && 'Alt', keyboard.control && 'Ctrl', keyboard.shift && 'Shift'],
    windowsLinux: [keyboard.meta && 'Ctrl', keyboard.alt && 'Alt', (keyboard.shift || keyboard.control) && 'Shift'],
  }
  const accelerators = _.mapValues(modifiers, (platformModifiers, platform) => {
    // On Windows and Linux, a shortcut with Control alone becomes Shift-only.
    if (!platformModifiers.some(modifier => modifier && modifier !== 'Shift')) return undefined
    const accelerator = [...platformModifiers, key].filter(Boolean).join('+')
    return NATIVE_ACCELERATORS[platform as keyof Accelerators].includes(accelerator) ? undefined : accelerator
  })
  return accelerators.macos || accelerators.windowsLinux ? accelerators : undefined
}

/**
 * Builds the definition of the desktop app's system menu from the commands: the commands that name a systemMenu,
 * grouped by it and sorted by label. Each item has the command's id and label, and the accelerators of the keyboard
 * shortcut that the app displays for it on each platform, except one that a native item already has. The page still
 * runs such a command from its shortcut, since the page sees a key before the menu does. The definition is committed
 * as desktop/menu.json, which desktop/src/menu.rs builds the native menu from. Regenerate it with `yarn tauri:menu`.
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
        return {
          id: command.id,
          label: command.label,
          accelerator: keyboard
            ? toAccelerators(command, typeof keyboard === 'string' ? { key: keyboard } : keyboard)
            : undefined,
          // A check mark shows the toggle state of a command that has no inverse label to show it with. The isActive of a dropdown command only highlights its toolbar button, so it is not a toggle state.
          checkable: !!command.isActive && !command.labelInverse && !command.isDropdownOpen,
        }
      }),
  )

export default systemMenuDefinition
