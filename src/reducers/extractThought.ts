import _ from 'lodash'
import { State } from '../util/initialState'
import { headRank, headValue, pathToContext, reducerFlow } from '../util'
import existingThoughtChange from './existingThoughtChange'
import newThought from './newThought'
import { rootedParentOf, simplifyPath } from '../selectors'
import alert from './alert'

/** Extract the selection as child thought. */
const extractThought = (state: State) => {
  const { cursor } = state
  if (!cursor) return state

  const selection = window.getSelection()
  if (!selection || !selection?.rangeCount) {
    return state
  }

  const selectionStart = window.getSelection()?.getRangeAt(0).startOffset || 0
  const selectionEnd = selectionStart + selection.toString().length
  if (selectionStart === selectionEnd) {
    return alert(state, { value: 'No text selected to extract' })
  }

  const value = headValue(cursor)
  const newValue = `${value.slice(0, selectionStart)}${value.slice(selectionEnd, value.length)}`.trim()
  const childValue = value.slice(selectionStart, selectionEnd)

  const thoughts = pathToContext(cursor)
  const cursorContext = rootedParentOf(state, thoughts)
  const rank = headRank(cursor)

  const reducers = [
    existingThoughtChange({
      oldValue: value,
      newValue,
      context: cursorContext,
      path: simplifyPath(state, cursor),
      rankInContext: rank
    }),
    newThought({ value: childValue, insertNewSubthought: true, preventSetCursor: true }),
  ]

  return reducerFlow(reducers)(state)
}

export default _.curryRight(extractThought)
