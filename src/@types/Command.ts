import React from 'react'
import { GestureResponderEvent } from 'react-native'
import CommandId from './CommandId'
import CommandType from './CommandType'
import Dispatch from './Dispatch'
import Gesture from './Gesture'
import IconType from './IconType'
import Key from './Key'
import MulticursorFilter from './MulticursorFilter'
import Path from './Path'
import State from './State'

/** A command that the user initiates via keyboard, gesture, toolbar, or Command Palette. When creating a new command, carefully think through all the properties that are appropriate. */
interface Command {
  /**************************
   * REQUIRED
   **************************/

  /** A readable, internal unique id. */
  id: CommandId

  /** Executes the command. */
  exec: (
    dispatch: Dispatch,
    getState: () => State,
    e: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent | React.ClipboardEvent,
    { type }: { type: CommandType },
  ) => void | Promise<void>

  /** Short label. */
  label: string

  /**
   * Determines how the command behaves when multiple thoughts are selected. This is a required property because multicursor support is nontrivial, and it must be thought through for each new command that is added.
   * - If true, the command will be executed for each cursor. Optional object for more control.
   * - If false, the command will be executed as if there were no multicursors. The command will be executed on state.cursor as usual and any thoughts that are selected will stay selected. This is ideal for commands that do not interact with the thoughtspace, such as opening the Command Palette or navigating to a modal. If instead you want to disallow the command when multiple thoughts are selected, set { disallow: true }.
   **/
  multicursor:
    | boolean
    | {
        /** If true, execution of the command will be prevented and the user will be shown an alert. This should only be used if the command makes absolutely no sense when multiple thoughts are selected. In most cases, even if there is no multiselect behavior, you can just execute the command on state.cursor (by setting multicursor: false) or execute the command on the first or last sibling (by setting { filter: 'first-sibling' } or { filter: 'last-sibling' ). */
        disallow?: boolean
        /** An error message to display when multicursor mode is not enabled. */
        error?: ((state: State) => string) | string
        /** Optional override for executing the command for multiple cursors. */
        execMulticursor?: (cursors: Path[], dispatch: Dispatch, getState: () => State) => void
        /** A callback that is invoked when the command finishes executing for all filtered multicursors. */
        onComplete?: (filteredCursors: Path[], dispatch: Dispatch, getState: () => State) => void
        /** Prevent the cursor from being set back at the end of the command execution. */
        preventSetCursor?: boolean
        /** Reverse the order of the cursors before executing the command. */
        reverse?: boolean
        /** Clear the multicursor after the command is executed. */
        clearMulticursor?: boolean
        /**
         * Filter the cursors before executing the command.
         *
         * - 'all' - Execute the command for all cursors (default).
         * - 'first-sibling' - Execute the command for only the first sibling within the same parent.
         * - 'last-sibling' - Execute the command for only the last sibling within the same parent.
         * - 'prefer-ancestor' - Execute the command for the highest direct ancestors in the selection.
         */
        filter?: MulticursorFilter
      }

  /**************************
   * OPTONAL
   **************************/

  /** Allow the command to be executed when a modal is open. This is generally false for commands that navigate or modify the thoughtspace, and true for commands that navigate to different modals. */
  allowExecuteFromModal?: boolean

  /** A selector that returns true if the command can be executed with the current state. */
  canExecute?: (state: State) => boolean

  /** A description of what the command does that is shown in the Help modal. */
  description?: string | ((state: State) => string)

  /** A description of what the command does whnn it is in an inverse state. */
  descriptionInverse?: string | ((state: State) => string)

  /** A function that returns an error message if the command should indicate an error. */
  error?: (state: State) => string | null

  /** A MultiGesture sequence to activate the command on touch screens. If an array of Gestures are provided, the first gesture in the array will be shown in the UI but the command can be activated by any of them. */
  gesture?: Gesture | Gesture[]

  /** Do not show the alert after the command is executed in training mode. */
  hideAlert?: boolean

  /** Hide the command in the CommandPalette. */
  hideFromCommandPalette?: boolean

  /** Hide the command in the Help modal and CommandPalette. */
  hideFromHelp?: boolean

  /** A function that returns true if the command should be highlighted in the Toolbar. */
  isActive?: (state: State) => boolean

  /** When true, a small open dropdown indicator will be rendered beneath the icon for this command in the Toolbar. */
  isDropdownOpen?: (state: State) => boolean

  /** A keyboard sequence or array of sequences to activate the command. The first keyboard shortcut in the array will be shown in the UI. */
  keyboard?: Key | Key[] | string

  /** For toggling commands, a short label that indicates the inverse action from the current state (e.g. "Add to Favorites" and "Remove from Favorites"). */
  labelInverse?: string

  /** A callback that is invoked when the command's toolbar button is long pressed. */
  longPress?: (dispatch: Dispatch) => void

  /** Specify backup gesture or keyboard that is shown in the Toolbar overlay. */
  overlay?: {
    gesture?: Gesture
    keyboard?: Key | Key[] | string
  }

  /** When true, do not prevent the default browser behavior even when canExecute returns true. */
  permitDefault?: boolean

  /** When true, prevent the default browser behavior even when canExecute returns false. */
  preventDefault?: boolean

  /** An icon that represents the command in the Toolbar. */
  svg?: (icon: IconType) => React.ReactNode

  /** When true, renders the gesture with rounded corners in the GestureDiagram. */
  rounded?: boolean

  /** When true, hides the title for this command when shown in panels. */
  hideTitleInPanels?: boolean

  /** Return true if the given command's gesture can be chained after the current command's gesture without lifting the finger to execute one after another. For example, after entering the gesture for Select All, all of the multicursor commands can be executed by continuing with their gesture. */
  isChainable?: (command: Command) => boolean
}

export default Command
