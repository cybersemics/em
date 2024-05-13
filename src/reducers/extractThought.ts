import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import alert from './alert'
import editThought from './editThought'
import newThought from './newThought'

/** Extract the selection as child thought. */
const extractThought = (state: State) => {
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

  const { value, rank } = cursorThought
  const newValue = `${value.slice(0, selectionStart)}${value.slice(selectionEnd, value.length)}`.trim()
  const childValue = value.slice(selectionStart, selectionEnd)

  const reducers = [
    editThought({
      oldValue: value,
      newValue,
      path: simplifyPath(state, cursor),
      rankInContext: rank,
    }),
    newThought({ value: childValue, insertNewSubthought: true, preventSetCursor: true }),
  ]

  return reducerFlow(reducers)(state)
}

/** Action-creator for extractThought. */
export const extractThoughtActionCreator = (): Thunk => dispatch => dispatch({ type: 'extractThought' })

export default _.curryRight(extractThought)
