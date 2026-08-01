import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import BackIcon from '../components/icons/BackIcon'
import * as selection from '../device/selection'
import globals from '../globals'
import isTableCol2 from '../selectors/isTableCol2'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'

/** Moves the cursor from a table column-two thought to its parent (column one) when ArrowLeft is pressed with the caret at the beginning of the thought. The caret lands at the end of the column-one thought, continuing the leftward motion. Otherwise permits the default browser caret movement within the thought. */
const cursorBackTableCommand: Command = {
  id: 'cursorBackTable',
  label: 'Cursor Back (Table Column)',
  description: 'In table view, move the cursor from a column-two thought back to its column-one parent.',
  keyboard: { key: Key.ArrowLeft },
  hideFromHelp: true,
  multicursor: false,
  svg: BackIcon,
  canExecute: state => {
    const { cursor } = state
    if (!cursor) return false

    // only applies to column-two thoughts, i.e. thoughts whose grandparent has =view/Table
    if (!isTableCol2(state, cursor)) return false

    // only when the caret is collapsed at the beginning of the thought
    if (!selection.isThought() || !selection.isCollapsed()) return false
    return selection.offsetThought() === 0
  },
  exec: (dispatch, getState, e, { type }) => {
    const event = e as KeyboardEvent
    // require a discrete keypress to cross the column boundary; ignore auto-repeat while the key is held down
    if (type === 'keyboard' && event.repeat) return

    const state = getState()
    const { cursor } = state
    if (!cursor) return

    // the column-one parent of the current column-two thought
    const parentPath = parentOf(cursor)
    const value = headValue(state, parentPath)

    // place the caret at the end of the column-one thought, continuing the leftward caret motion
    dispatch(setCursor({ path: parentPath, offset: value?.length ?? 0, preserveMulticursor: true }))

    // suppress auto-repeat of this key until it is released so that holding it does not race the caret through the parent thought
    if (type === 'keyboard') globals.arrowKeyBoundaryCross = event.key
  },
}

export default cursorBackTableCommand
