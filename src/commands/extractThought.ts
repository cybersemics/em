import Command from '../@types/Command'
import { extractThoughtActionCreator as extract } from '../actions/extractThought'
import ExtractThoughtIcon from '../components/icons/ExtractThoughtIcon'
import hasMulticursor from '../selectors/hasMulticursor'

const extractThought = {
  id: 'extractThought',
  label: 'Extract' as const,
  description: 'Extract selected part of a thought as its child',
  keyboard: { key: 'e', control: true, meta: true },
  // Extract takes its input from the browser text selection, of which the document has exactly one. The
  // extractThought action slices state.cursor's value at that selection's character offsets, so the offsets are only
  // meaningful for the thought that owns the selection. Executing on state.cursor is therefore the only well-defined
  // behavior: the per-cursor loop of multicursor: true would slice every other selected thought at offsets that index
  // into a different string, mangling their values and giving short ones an empty child.
  multicursor: false,
  svg: ExtractThoughtIcon,
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  exec: dispatch => {
    dispatch(extract())
  },
} satisfies Command

export default extractThought
