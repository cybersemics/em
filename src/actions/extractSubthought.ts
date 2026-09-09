import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import getThoughtById from '../selectors/getThoughtById'
import selectionOffsets from '../selectors/selectionOffsets'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import splitFormattedValue from '../util/splitFormattedValue'
import alert from './alert'
import editThought from './editThought'
import newThought from './newThought'

/** Extract the selection as child thought. */
export interface extractSubthoughtPayload {
  /** The character offset of the start of the selection within the cursor thought's value. */
  selectionStart: number
  /** The character offset of the end of the selection within the cursor thought's value. */
  selectionEnd: number
}

/** Extract the given range of the cursor thought as a subthought. */
const extractSubthought = (state: State, { selectionStart, selectionEnd }: extractSubthoughtPayload): State => {
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

  // A formatted value cannot be sliced by the selection offsets, since they are plain text offsets that do not line up with the indices of the markup, causing the slice to land in the middle of a tag (#4103). Split it as HTML instead. An unformatted value takes the fast path, avoiding the DOM entirely.
  const { remainingValue, extractedValue } =
    plainValue === value
      ? {
          remainingValue: `${value.slice(0, selectionStart)}${value.slice(selectionEnd, value.length)}`.trim(),
          extractedValue: value.slice(selectionStart, selectionEnd),
        }
      : splitFormattedValue(value, selectionStart, selectionEnd)

  const reducers = [
    editThought({
      oldValue: value,
      newValue: remainingValue,
      path: simplifyPath(state, cursor),
      force: true,
      cursorOffset: state.cursorOffset != null ? selectionStart : undefined,
    }),
    newThought({ value: extractedValue, insertNewSubthought: true, preventSetCursor: true }),
  ]

  return reducerFlow(reducers)(state)
}

/**
 * Action-creator for extractSubthought. Reads the selection offsets and passes them to the reducer, which cannot read them
 * itself without reaching outside of state.
 */
export const extractSubthoughtActionCreator = (): Thunk => (dispatch, getState) => {
  const offsets = selectionOffsets(getState())
  if (!offsets) return

  dispatch({ type: 'extractSubthought', selectionStart: offsets.start, selectionEnd: offsets.end })
}

export default _.curryRight(extractSubthought)

// Register this action's metadata
registerActionMetadata('extractSubthought', {
  undoable: true,
})
