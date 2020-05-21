// constants
import {
  RANKED_ROOT,
} from '../constants'

// util
import {
  isFunction,
  nextThought,
} from '../util'

// selectors
import {
  getThoughtsRanked,
  meta,
} from '../selectors'

/** Moves the cursor to the next child, sibling, or nearest uncle. */
export default () => (dispatch, getState) => {

  const state = getState()
  const { cursor, showHiddenThoughts } = state

  // if there is a cursor, get the next logical child, sibling, or uncle
  if (cursor) {
    const { nextThoughts, contextChain } = nextThought(state, cursor)

    if (nextThoughts.length) {
      dispatch({ type: 'setCursor', thoughtsRanked: nextThoughts, contextChain: contextChain || [], cursorHistoryClear: true, editing: true })
    }
  }
  // if no cursor, move cursor to first thought in root
  else {
    /** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
    const notHidden = child => !isFunction(child.value) && !meta(state, [child.value]).hidden
    const children = getThoughtsRanked(state, RANKED_ROOT)
    const childrenFiltered = showHiddenThoughts
      ? children
      : children.filter(notHidden)
    const firstSubthought = childrenFiltered[0]
    if (firstSubthought) {
      dispatch({ type: 'setCursor', thoughtsRanked: [firstSubthought] })
    }
  }
}
