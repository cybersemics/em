import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { cursorForwardActionCreator as cursorForward } from '../actions/cursorForward'
import CursorForwardIcon from '../components/icons/CursorForwardIcon'
import * as selection from '../device/selection'
import attributeEquals from '../selectors/attributeEquals'
import { firstVisibleChild } from '../selectors/getChildren'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import headValue from '../util/headValue'

/** Moves the cursor from a table column-one thought to its first child (column two) when ArrowRight is pressed with the caret at the end of the thought. Otherwise permits the default browser caret movement within the thought. */
const cursorForwardTableCommand: Command = {
  id: 'cursorForwardTable',
  label: 'Cursor Forward (Table Column)',
  description: 'In table view, move the cursor from a column-one thought to its column-two child.',
  keyboard: { key: Key.ArrowRight },
  hideFromHelp: true,
  multicursor: false,
  svg: CursorForwardIcon,
  canExecute: state => {
    const { cursor } = state
    if (!cursor) return false

    // only applies to column-one thoughts, i.e. thoughts whose parent has =view/Table
    const isTableCol1 = attributeEquals(state, head(rootedParentOf(state, cursor)), '=view', 'Table')
    if (!isTableCol1) return false

    // only when the caret is collapsed at the end of the thought
    if (!selection.isThought() || !selection.isCollapsed()) return false
    const value = headValue(state, cursor)
    if (selection.offsetThought() !== (value?.length ?? 0)) return false

    // only when there is a column-two child to move into
    return !!firstVisibleChild(state, head(simplifyPath(state, cursor)))
  },
  exec: dispatch => dispatch(cursorForward()),
}

export default cursorForwardTableCommand
