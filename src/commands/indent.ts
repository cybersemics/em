import Command from '../@types/Command'
import { indentActionCreator as indent } from '../actions/indent'
import IndentIcon from '../components/icons/IndentIcon'
import isDocumentEditable from '../util/isDocumentEditable'
import moveCursorForward from './moveCursorForward'

const indentCommand: Command = {
  id: 'indent',
  label: 'Indent',
  description: 'Indent the current thought one level deeper.',
  overlay: {
    keyboard: moveCursorForward.keyboard,
  },
  multicursor: {
    filter: 'prefer-ancestor',
  },
  gesture: 'rlr',
  svg: IndentIcon,
  canExecute: state => {
    return isDocumentEditable() && !!state.cursor
  },
  exec: dispatch => dispatch(indent()),
}

export default indentCommand
