import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import getThoughtById from '../selectors/getThoughtById'
import selectionOffsets from '../selectors/selectionOffsets'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import equalPath from '../util/equalPath'
import head from '../util/head'
import splitFormattedValue from '../util/splitFormattedValue'
import alert from './alert'
import categorize from './categorize'
import editThought from './editThought'

export interface extractCategoryPayload {
  /** The character offset of the start of the selection within the cursor thought's value. */
  selectionStart: number
  /** The character offset of the end of the selection within the cursor thought's value. */
  selectionEnd: number
}

/** Extracts the given range of the cursor thought as a new category, moving the thought (or the selected thoughts) into it. */
const extractCategory = (state: State, { selectionStart, selectionEnd }: extractCategoryPayload): State => {
  const { cursor } = state
  if (!cursor) return state

  if (selectionStart === selectionEnd) {
    return alert(state, { value: 'No text selected to extract' })
  }

  const cursorThought = getThoughtById(state, head(cursor))

  if (!cursorThought) {
    console.warn('Cursor thought not found!')
    return state
  }

  const { value } = cursorThought
  const plainValue = getTextContentFromHTML(value)

  // A formatted value cannot be sliced by the selection offsets, since they are plain text offsets that do not line up with the indices of the markup, causing the slice to land in the middle of a tag (#5267). Split it as HTML instead. An unformatted value takes the fast path, avoiding the DOM entirely.
  const { remainingValue, extractedValue } =
    plainValue === value
      ? {
          remainingValue: `${value.slice(0, selectionStart)}${value.slice(selectionEnd, value.length)}`.trim(),
          extractedValue: value.slice(selectionStart, selectionEnd),
        }
      : splitFormattedValue(value, selectionStart, selectionEnd)

  // Categorize before editing. categorize refuses to categorize in some contexts (a direct child of the home or em
  // context, a read-only or unextendable parent, thoughts from different parents), alerting instead. Stripping the
  // selection first would drop the extracted text into a category that was never created.
  const stateCategorized = categorize(state, { value: extractedValue })

  // categorize signals success by moving the cursor onto the category it created, so an unmoved cursor means it
  // refused and the thought must keep its full value.
  if (equalPath(stateCategorized.cursor, cursor)) return stateCategorized

  return editThought(stateCategorized, {
    oldValue: value,
    newValue: remainingValue,
    // The thought has been moved under the new category, so its path is no longer the cursor's. Its id is unchanged.
    path: thoughtToPath(stateCategorized, head(cursor)),
    force: true,
  })
}

/**
 * Action-creator for extractCategory. Reads the selection offsets and passes them to the reducer, which cannot read them
 * itself without reaching outside of state.
 */
export const extractCategoryActionCreator = (): Thunk => (dispatch, getState) => {
  const offsets = selectionOffsets(getState())
  if (!offsets) return

  dispatch({ type: 'extractCategory', selectionStart: offsets.start, selectionEnd: offsets.end })
}

export default _.curryRight(extractCategory)

// Register this action's metadata
registerActionMetadata('extractCategory', {
  undoable: true,
})
