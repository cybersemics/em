import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import mergeAdjacentTags from '../util/mergeAdjacentTags'
import reducerFlow from '../util/reducerFlow'
import splitHtmlAtTextOffset from '../util/splitHtmlAtTextOffset'
import trimHtml from '../util/trimHtml'
import alert from './alert'
import editThought from './editThought'
import newThought from './newThought'

/** Splits a formatted value at the selection offsets into the value with the selection removed and the extracted selection, with formatting tags re-balanced onto each part. */
const splitFormattedValue = (value: string, selectionStart: number, selectionEnd: number) => {
  // Split at the end offset first so that the left half can then be split at the start offset. The right half of a split cannot be re-split at the end offset, since its text offsets are relative to itself, not to the original value.
  const endSplit = splitHtmlAtTextOffset(value, selectionEnd)
  return {
    // merge the formatting tags that end up adjacent when the two halves are re-joined, e.g. <b>Lorem </b><b>dolor</b>
    newValue: trimHtml(mergeAdjacentTags(`${splitHtmlAtTextOffset(value, selectionStart).left}${endSplit.right}`)),
    childValue: trimHtml(splitHtmlAtTextOffset(endSplit.left, selectionStart).right),
  }
}

/** Extract the selection as child thought. */
const extractThought = (state: State): State => {
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
  const plainValue = getTextContentFromHTML(value)

  // A formatted value cannot be sliced by the selection offsets, since they are plain text offsets that do not line up with the indices of the markup, causing the slice to land in the middle of a tag (#4103). Split it as HTML instead. An unformatted value takes the fast path, avoiding the DOM entirely.
  const { newValue, childValue } =
    plainValue === value
      ? {
          newValue: `${value.slice(0, selectionStart)}${value.slice(selectionEnd, value.length)}`.trim(),
          childValue: value.slice(selectionStart, selectionEnd),
        }
      : splitFormattedValue(value, selectionStart, selectionEnd)

  const reducers = [
    editThought({
      oldValue: value,
      newValue,
      path: simplifyPath(state, cursor),
      force: true,
      cursorOffset: state.cursorOffset != null ? state.cursorOffset - (value.length - newValue.length) : undefined,
    }),
    newThought({ value: childValue, insertNewSubthought: true, preventSetCursor: true }),
  ]

  return reducerFlow(reducers)(state)
}

/** Action-creator for extractThought. */
export const extractThoughtActionCreator = (): Thunk => dispatch => dispatch({ type: 'extractThought' })

export default _.curryRight(extractThought)

// Register this action's metadata
registerActionMetadata('extractThought', {
  undoable: true,
})
