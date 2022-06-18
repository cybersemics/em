import _ from 'lodash'
import head from '../util/head'
import pathToContext from '../util/pathToContext'
import reducerFlow from '../util/reducerFlow'
import editThought from './editThought'
import newThought from './newThought'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import alert from './alert'
import State from '../@types/State'
import * as selection from '../device/selection'

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

  const thoughts = pathToContext(state, cursor)
  const cursorContext = rootedParentOf(state, thoughts)

  const reducers = [
    editThought({
      oldValue: value,
      newValue,
      context: cursorContext,
      path: simplifyPath(state, cursor),
      rankInContext: rank,
    }),
    newThought({ value: childValue, insertNewSubthought: true, preventSetCursor: true }),
  ]

  return reducerFlow(reducers)(state)
}

export default _.curryRight(extractThought)
