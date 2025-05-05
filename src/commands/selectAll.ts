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
  // meta + a is conditionally active when multicursor is active
  keyboard: [
    { key: 'a', meta: true, alt: true },
    { key: 'a', meta: true },
  ],
  multicursor: false,
  canExecute: state => {
    //document must be editable
    if (!isDocumentEditable()) {
      return false
    }

    // Check which keyboard shortcut was used
    // If we're using meta+a, only allow it when multicursor is active
    // If we're using meta+alt+a, always allow it
    const e = window.event as KeyboardEvent
    if (e && e.key === 'a' && e.metaKey && !e.altKey) {
      return hasMulticursor(state)
    }

    return true
  },
  exec: addAllMulticursor(),
}

export default selectAllCommand
