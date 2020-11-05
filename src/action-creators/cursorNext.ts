import { ROOT_TOKEN } from '../constants'
import { suppressExpansion } from '../action-creators'
import { parentOf, scrollCursorIntoView } from '../util'
import { ActionCreator } from '../types'

// must be imported after util (???)
import { getChildrenSorted, getThoughtAfter, simplifyPath } from '../selectors'

/** Moves the cursor to the next sibling, ignoring descendants. */
const cursorNext = (): ActionCreator => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) {
    const children = getChildrenSorted(state, [ROOT_TOKEN])
    if (children.length > 0) {
      dispatch({ type: 'setCursor', path: [children[0]] })
      setTimeout(scrollCursorIntoView)
    }
    return
  }

  const next = getThoughtAfter(state, simplifyPath(state, cursor))
  if (!next) return

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  dispatch(suppressExpansion({ duration: 100 }))

  const path = parentOf(cursor).concat(next)
  dispatch({ type: 'setCursor', path })
  setTimeout(scrollCursorIntoView)
}

export default cursorNext
