import { RANKED_ROOT } from '../constants'
import { setCursor } from '../reducers'
import { getThoughtsRanked, hasChild } from '../selectors'
import { isFunction, nextThought } from '../util'
import { State } from '../util/initialState'
import { Child } from '../types'

/** Moves the cursor to the next child, sibling, or nearest uncle. */
const cursorDown = (state: State) => {

  const { cursor, showHiddenThoughts } = state

  // if there is a cursor, get the next logical child, sibling, or uncle
  if (cursor) {
    const { nextThoughts, contextChain } = nextThought(state, cursor)
    return nextThoughts.length > 0
      ? setCursor(state, {
        thoughtsRanked: nextThoughts,
        contextChain: contextChain || [],
        cursorHistoryClear: true,
        editing: true
      })
      : state
  }
  // if no cursor, move cursor to first thought in root
  else {
    /** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
    const notHidden = (child: Child) => !isFunction(child.value) && !hasChild(state, [child.value], '=hidden')
    const children = getThoughtsRanked(state, RANKED_ROOT)
    const childrenFiltered = showHiddenThoughts
      ? children
      : children.filter(notHidden)
    const firstSubthought = childrenFiltered[0]
    return firstSubthought
      ? setCursor(state, {
        thoughtsRanked: [firstSubthought]
      })
      : state
  }
}

export default cursorDown
