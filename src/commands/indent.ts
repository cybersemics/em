import Command from '../@types/Command'
import { indentActionCreator as indent } from '../actions/indent'
import { isTouch } from '../browser'
import IndentIcon from '../components/icons/IndentIcon'
import prevSibling from '../selectors/prevSibling'
import selectedPaths from '../selectors/selectedPaths'
import editingValueStore from '../stores/editingValue'
import isDocumentEditable from '../util/isDocumentEditable'
import moveCursorForward from './moveCursorForward'

const indentCommand: Command = {
  id: 'indent',
  label: 'Indent',
  description: 'Indent the current thought one level deeper.',
  overlay: {
    keyboard: moveCursorForward.keyboard,
  },
  // space-to-indent
  // exec will conditionally preventDefault based on whether we are on an empty thought
  keyboard: [{ key: ' ' }, { key: ' ', shift: true }],
  multicursor: {
    filter: 'prefer-ancestor',
  },
  gesture: 'rlr',
  // must allow default browser behavior and manually control preventDefault defending on whether space-to-indent is activated
  permitDefault: true,
  svg: IndentIcon,
  canExecute: state => {
    // indent is a no-op on the first thought in a context, so the command is only executable if every selected thought has a previous sibling to be indented into
    const paths = selectedPaths(state)
    return isDocumentEditable() && paths.length > 0 && paths.every(path => !!prevSibling(state, path))
  },
  exec: (dispatch, getState, e, { type }) => {
    // Allow space-to-indent on empty thought.
    // Otherwise bail and allow default browser behavior (inserting a space).
    if (type === 'keyboard' && editingValueStore.getState() !== '') return

    // Default browser behavior allows for autocapitalization on mobile, so cannot be prevented.
    // Instead, beforeinput is prevented in the keyDown handler in commands.ts to prevent the space character from being inserted.
    if (!isTouch) {
      e.preventDefault()
    }

    dispatch(indent())
  },
  hideTitleInPanels: true,
}

export default indentCommand
