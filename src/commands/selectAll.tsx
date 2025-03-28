import Command from '../@types/Command'
import { addAllMulticursorActionCreator as addAllMulticursor } from '../actions/addAllMulticursor'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const selectAllCommand: Command = {
  id: 'selectAll',
  label: 'Select All',
  description: 'Selects all thoughts at the current level. May reduce wrist strain.',
  gesture: 'ldr',
  // meta + alt + a is the default keyboard shortcut and always works.
  // See alias below for meta + a when multiselect is active.
  keyboard: { key: 'a', meta: true, alt: true },
  multicursor: 'ignore',
  canExecute: isDocumentEditable,
  exec: addAllMulticursor(),
}

/** An alias to allow meta + a when multiselect is active (when it cannot interfere with selecting all text within a thought). */
export const selectAllAlias: Command = {
  id: 'selectAllAlias',
  label: 'Select All',
  keyboard: { key: 'a', meta: true },
  hideFromHelp: true,
  multicursor: 'ignore',
  // This meta + a alias is active only when there is no multicursor.
  // This allows the default browser behavior of selecting all text in the thought.
  canExecute: state => isDocumentEditable() && hasMulticursor(state),
  exec: addAllMulticursor(),
}

export default selectAllCommand
