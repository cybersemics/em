import CommandState from '../@types/CommandState'
import FormattingCommand from '../@types/FormattingCommand'
import State from '../@types/State'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import themeColors from '../selectors/themeColors'
import getCommandState from '../util/getCommandState'
import rgbToHex from '../util/rgbToHex'
import store from './app'
import reactMinistore from './react-ministore'

/** A store that tracks the document's command state (e.g. bold, italic, underline, strikethrough). */
const commandStateStore = reactMinistore<CommandState>({
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  code: false,
  foreColor: undefined,
  backColor: undefined,
})

/** Resets the command state to false. */
export const resetCommandState = () => {
  commandStateStore.update({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
}

/** Returns true if two color values resolve to the same hex color. */
const equalColor = (a: string, b: string) => {
  try {
    return rgbToHex(a).toLowerCase() === rgbToHex(b).toLowerCase()
  } catch {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
  }
}

/** Returns the active command color if it is not one of the default editor colors. */
const getCustomCommandColor = (command: 'foreColor' | 'backColor', defaults: string[]) => {
  if (typeof document === 'undefined' || typeof document.queryCommandValue !== 'function') return undefined

  const color = document.queryCommandValue(command)
  return color && !defaults.some(defaultColor => equalColor(color, defaultColor)) ? color : undefined
}

/** Gets active foreground/background colors from the browser command state for an empty thought selection. */
const getActiveEmptySelectionColors = (state: State): Partial<CommandState> => {
  const colors = themeColors(state)
  const defaultColors = [colors.bg, colors.fg, colors.fgNote]

  return {
    [FormattingCommand.foreColor]: getCustomCommandColor('foreColor', defaultColors),
    [FormattingCommand.backColor]: getCustomCommandColor('backColor', defaultColors),
  }
}

/** Updates the command state to the current selection/thought. If there is an active selection, this uses document.queryCommandState to get the command state from the DOM. This detects a formatting style that has been enabled, but not yet entered (i.e. the next character typed will be bold). If there is no selection, this parses the cursor thought's value and sets a formatting state only if it applies to the entire thought. */
export const updateCommandState = () => {
  const state = store.getState()
  if (!state.cursor) return
  const selectionIsActiveThought = selection.isActive() && selection.isThought()
  const action = selectionIsActiveThought
    ? {
        ...getCommandState(selection.html() ?? ''),
        ...(!selection.text()?.length ? getActiveEmptySelectionColors(state) : {}),
      }
    : getCommandState(pathToThought(state, state.cursor)?.value ?? '')
  commandStateStore.update(action)
}

export default commandStateStore
