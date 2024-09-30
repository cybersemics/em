import React from 'react'
import { GestureResponderEvent } from 'react-native'
import Dispatch from './Dispatch'
import GesturePath from './GesturePath'
import Icon from './Icon'
import Key from './Key'
import MulticursorFilter from './MulticursorFilter'
import Path from './Path'
import ShortcutId from './ShortcutId'
import ShortcutType from './ShortcutType'
import State from './State'

interface Shortcut {
  /** Allow the shortcut to be executed when a modal is open. */
  allowExecuteFromModal?: boolean

  /** A function that returns true if the shortcut can be executed with the current state. */
  canExecute?: (getState: () => State) => boolean

  /** An ad hoc property to track conflicting shortcuts. */
  // TODO: Refactor so this is not in the main Shortcut type.
  conflicts?: string[]

  /** A description of what the shortcut does that is shown in the Help modal. */
  description?: string | ((getState: () => State) => string)

  /** A description of what the shortcut does whnn it is in an inverse state. */
  descriptionInverse?: string | ((getState: () => State) => string)

  /** A function that returns an error message if the shortcut should indicate an error. */
  error?: (getState: () => State) => string | null

  /** Executes the shortcut. */
  exec: (
    dispatch: Dispatch,
    getState: () => State,
    e: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent,
    { type }: { type: ShortcutType },
  ) => void | Promise<void>

  /** A MultiGesture sequence to activate the shortcut on touch screens. */
  gesture?: GesturePath | GesturePath[]

  /** Hide the shortcut in the CommandPalette. */
  hideFromCommandPalette?: boolean

  /** Hide the shortcut in the Help modal and CommandPalette. */
  hideFromHelp?: boolean

  /** A readable, internal unique id. */
  id: ShortcutId

  /** A function that returns true if the shortcut should be highlighted in the Toolbar. */
  isActive?: (getState: () => State) => boolean

  /** When true, a small open dropdown indicator will be rendered beneath the icon. */
  isDropdownOpen?: (getState: () => State) => boolean

  /** A keyboard sequence to activate the shortcut. */
  keyboard?: Key | string

  /** Short label. */
  label: string

  /** For toggling shortcuts, a short label that indicates the inverse action from the current state (e.g. "Add to Favorites" and "Remove from Favorites"). */
  labelInverse?: string

  /** Specify backup gesture or keyboard that is shown in the Toolbar overlay. */
  overlay?: {
    gesture?: GesturePath
    keyboard?: Key | string
  }

  // an icon that represents the shortcut in the Toolbar
  svg: (icon: Icon) => React.ReactNode

  /** Multicursor support. If 'ignore', the shortcut will be executed as if there were no multicursors. When true, the shortcut will be executed for each cursor. Optional object for more control. */
  multicursor:
    | 'ignore'
    | boolean
    | {
        /** Whether multicursor mode is enabled for this shortcut. */
        enabled: boolean
        /** An error message to display when multicursor mode is not enabled. */
        error?: (getState: () => State) => string | null
        /** Optional override for executing the shortcut for multiple cursors. */
        execMulticursor?: (
          cursors: Path[],
          dispatch: Dispatch,
          getState: () => State,
          e: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent,
          { type }: { type: ShortcutType },
          execMulticursor: () => void,
        ) => void
        /** Prevent the cursor from being set back at the end of the shortcut execution. */
        preventSetCursor?: boolean
        /** Reverse the order of the cursors before executing the shortcut. */
        reverse?: boolean
        /** Clear the multicursor after the shortcut is executed. */
        clearMulticursor?: boolean
        /**
         * Filter the cursors before executing the shortcut.
         *
         * 'none' - Execute the shortcut for all cursors.
         * 'first-sibling' - Execute the shortcut for only the first sibling within the same parent.
         * 'last-sibling' - Execute the shortcut for only the last sibling within the same parent.
         */
        filter?: MulticursorFilter
      }
}

export default Shortcut
