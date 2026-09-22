import CommandState from '../@types/CommandState'
import FormattingCommand from '../@types/FormattingCommand'
import State from '../@types/State'
import * as selection from '../device/selection'
import noteThought from '../selectors/noteThought'
import pathToThought from '../selectors/pathToThought'
import selectedPaths from '../selectors/selectedPaths'
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

/** Reduces the command state of every selected thought to the formatting they all share. A formatting command applies to the whole selection, so a swatch that claimed a color only some of the thoughts have would clear it on the next tap rather than apply it to the rest. */
const intersectCommandState = (commandStates: CommandState[]): CommandState =>
  commandStates.reduce((a, b) => ({
    bold: a.bold && b.bold,
    italic: a.italic && b.italic,
    underline: a.underline && b.underline,
    strikethrough: a.strikethrough && b.strikethrough,
    code: a.code && b.code,
    foreColor: a.foreColor === b.foreColor ? a.foreColor : undefined,
    backColor: a.backColor === b.backColor ? a.backColor : undefined,
  }))

/** Updates the command state to the current selection/thought. If the cursor thought is empty and is holding formatting, this reports the formatting it holds. If there is an active selection, this uses document.queryCommandState to get the command state from the DOM. This detects a formatting style that has been enabled, but not yet entered (i.e. the next character typed will be bold). If there is no selection, this parses the value of each selected thought and sets a formatting state only if it applies to all of them in their entirety. */
export const updateCommandState = () => {
  const state = store.getState()
  // Formatting applied to an empty thought is held on the thought until it is typed into, so the toolbar and the
  // bullet report it from there rather than from the (necessarily empty) value (#3910). Under noteFocus the formatting
  // belongs to the note's own thought, not the cursor thought. The caret is on the cursor thought, so its held
  // formatting wins over the browser's command state below, which an empty thought's active selection would otherwise
  // report as unformatted.
  const pendingFormatThought = state.cursor
    ? state.noteFocus
      ? noteThought(state, state.cursor)
      : pathToThought(state, state.cursor)
    : null
  const pendingFormat = pendingFormatThought?.value.length === 0 ? pendingFormatThought.pendingFormat : undefined
  if (pendingFormat) {
    commandStateStore.update(getCommandState(pendingFormat))
    return
  }

  // The thoughts a formatting command will be applied to: the multiselection when there is one, which may have no
  // cursor at all if the Home button dismissed it. There is nothing to describe when nothing is selected.
  const paths = selectedPaths(state)
  if (!paths.length) return
  const selectionIsActiveThought = selection.isActive() && selection.isThought()
  const action = selectionIsActiveThought
    ? {
        ...getCommandState(selection.html() ?? ''),
        ...(!selection.text()?.length ? getActiveEmptySelectionColors(state) : {}),
      }
    : intersectCommandState(
        paths.map(path => {
          const thought = pathToThought(state, path)
          // An empty thought's formatting is held on the thought rather than in its value (#3910).
          return getCommandState((thought?.value.length === 0 ? thought.pendingFormat : thought?.value) ?? '')
        }),
      )
  commandStateStore.update(action)
}

export default commandStateStore
