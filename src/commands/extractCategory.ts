import Command from '../@types/Command'
import { extractCategoryActionCreator as extractCategory } from '../actions/extractCategory'
import ExtractCategoryIcon from '../components/icons/ExtractCategoryIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const extractCategoryCommand = {
  id: 'extractCategory',
  label: 'Extract Category' as const,
  description: 'Extract selected part of a thought as its new parent',
  keyboard: { key: 'e', control: true, meta: true, alt: true },
  // Extract Category takes its input from the browser text selection, of which the document has exactly one. The
  // extractCategory action slices state.cursor's value at that selection's character offsets, so the offsets are only
  // meaningful for the thought that owns the selection. The categorization it performs is multicursor-aware on its
  // own, since it delegates to the categorize action, which moves every selected thought into the new category.
  multicursor: false,
  svg: ExtractCategoryIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(extractCategory())
  },
} satisfies Command

export default extractCategoryCommand
