import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import equalPath from '../util/equalPath'
import head from '../util/head'
import alert from './alert'
import categorize from './categorize'
import editThought from './editThought'

/** Extracts the selection as a new category, moving the thought (or the selected thoughts) into it. */
const extractCategory = (state: State): State => {
  const { cursor } = state
  if (!cursor) return state

  if (!selection.isActive()) {
    return state
  }

  const selectionStart = selection.offsetStart()!
  const selectionEnd = selection.offsetEnd()!
  if (selectionStart === selectionEnd) {
    return alert(state, { value: 'No text selected to extract' })
  }

  const cursorThought = getThoughtById(state, head(cursor))

  if (!cursorThought) {
    console.warn('Cursor thought not found!')
    return state
  }

  const { value } = cursorThought
  const newValue = `${value.slice(0, selectionStart)}${value.slice(selectionEnd, value.length)}`.trim()
  const categoryValue = value.slice(selectionStart, selectionEnd)

  // Categorize before editing. categorize refuses to categorize in some contexts (a direct child of the home or em
  // context, a read-only or unextendable parent, thoughts from different parents), alerting instead. Stripping the
  // selection first would drop the extracted text into a category that was never created.
  const stateCategorized = categorize(state, { value: categoryValue })

  // categorize signals success by moving the cursor onto the category it created, so an unmoved cursor means it
  // refused and the thought must keep its full value.
  if (equalPath(stateCategorized.cursor, cursor)) return stateCategorized

  return editThought(stateCategorized, {
    oldValue: value,
    newValue,
    // The thought has been moved under the new category, so its path is no longer the cursor's. Its id is unchanged.
    path: thoughtToPath(stateCategorized, head(cursor)),
    force: true,
  })
}

/** Action-creator for extractCategory. */
export const extractCategoryActionCreator = (): Thunk => dispatch => dispatch({ type: 'extractCategory' })

export default _.curryRight(extractCategory)

// Register this action's metadata
registerActionMetadata('extractCategory', {
  undoable: true,
})
