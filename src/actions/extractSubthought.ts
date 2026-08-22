import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import alert from './alert'
import editThought from './editThought'
import newThought from './newThought'

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
  const newValue = `${value.slice(0, selectionStart)}${value.slice(selectionEnd, value.length)}`.trim()
  const childValue = value.slice(selectionStart, selectionEnd)

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

/**
 * Action-creator for extractSubthought. Reads the selection offsets from the document and passes them to the reducer,
 * which cannot read them itself without reaching outside of state.
 */
export const extractSubthoughtActionCreator = (): Thunk => dispatch => {
  // offsetStart and offsetEnd call getRangeAt(0), which throws when the document has no range at all
  if (!selection.isActive()) return

  const selectionStart = selection.offsetStart()
  const selectionEnd = selection.offsetEnd()
  if (selectionStart === null || selectionEnd === null) return

  dispatch({ type: 'extractSubthought', selectionStart, selectionEnd })
}

export default _.curryRight(extractSubthought)

// Register this action's metadata
registerActionMetadata('extractSubthought', {
  undoable: true,
})
