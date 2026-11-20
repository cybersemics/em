import Command from '../@types/Command'
import { swapNoteActionCreator } from '../actions/swapNote'
import SwapNoteIcon from '../components/icons/SwapNoteIcon'
import getThoughtById from '../selectors/getThoughtById'
import selectedPaths from '../selectors/selectedPaths'
import thoughtToPath from '../selectors/thoughtToPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDocumentEditable from '../util/isDocumentEditable'

const swapNote = {
  id: 'swapNote',
  label: 'Swap Note' as const,
  systemMenu: 'Edit',
  description: 'Convert a thought to a note.',
  keyboard: { key: 'n', alt: true, shift: true },
  gesture: 'ulr',
  multicursor: true,
  // Option + Shift + N types ˜ on macOS, so swallow the keypress even when the command is disabled, e.g. on a metaprogramming attribute or a note.
  preventDefault: true,
  canExecute: state => {
    // A metaprogramming attribute such as =favorite or =pin configures its parent, and its descendants are part of that configuration, e.g. the child of =note is the note itself. Swapping any of them would corrupt the metaprogramming, so the command is disabled when any selected thought is an attribute or inside one.
    const paths = selectedPaths(state)
    return (
      isDocumentEditable() &&
      paths.length > 0 &&
      paths.every(path => {
        // Context View can include attributes that are outside the selected thought's parent chain.
        const thoughtPath = thoughtToPath(state, head(path))
        return !path.some(id => isAttribute(getThoughtById(state, id)?.value ?? '') && thoughtPath.includes(id))
      })
    )
  },
  svg: SwapNoteIcon,
  exec: dispatch => {
    dispatch(swapNoteActionCreator())
  },
} satisfies Command

export default swapNote
