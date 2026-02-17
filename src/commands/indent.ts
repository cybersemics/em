import Command from '../@types/Command'
import { indentActionCreator as indent } from '../actions/indent'
import IndentIcon from '../components/icons/IndentIcon'
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
    return isDocumentEditable() && !!state.cursor
  },
  exec: (dispatch, getState, e, { type }) => {
    // Allow space-to-indent on empty thought.
    // Otherwise bail and allow default browser behavior (inserting a space).
    if (type === 'keyboard' && editingValueStore.getState() !== '') return

    e.preventDefault()
    dispatch(indent())
  },
  hideTitleInPanels: true,
}

export default indentCommand
