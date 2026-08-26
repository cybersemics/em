import Command from '../@types/Command'
import { extractSubthoughtActionCreator as extract } from '../actions/extractSubthought'
import ExtractSubthoughtIcon from '../components/icons/ExtractSubthoughtIcon'
import hasMulticursor from '../selectors/hasMulticursor'

const extractSubthought = {
  id: 'extractSubthought',
  label: 'Extract Subthought' as const,
  description: 'Extract selected part of a thought as its child',
  keyboard: { key: 'e', control: true, meta: true },
  // Extract takes its input from the browser text selection, of which the document has exactly one. The
  // extractSubthought action slices state.cursor's value at that selection's character offsets, so the offsets are only
  // meaningful for the thought that owns the selection. Executing on state.cursor is therefore the only well-defined
  // behavior: the per-cursor loop of multicursor: true would slice every other selected thought at offsets that index
  // into a different string, mangling their values and giving short ones an empty child.
  multicursor: false,
  svg: ExtractSubthoughtIcon,
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  exec: dispatch => {
    dispatch(extract())
  },
} satisfies Command

export default extractSubthought
