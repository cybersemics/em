// constants
import {
  RANKED_ROOT,
} from '../constants'

// util
import {
  contextOf,
  head,
  headValue,
  isDivider,
  isFunction,
  pathToContext,
  perma,
  selectNextEditable,
  unroot,
} from '../util'

// selectors
import {
  getSortPreference,
  getThoughtsRanked,
  getThoughtsSorted,
  meta,
  nextSibling,
} from '../selectors'

export const cursorDown = ({ target }) => (dispatch, getState) => {
  const state = getState()
  const { cursor, showHiddenThoughts } = state
  const thoughtsRanked = cursor || RANKED_ROOT
  const { value, rank } = head(thoughtsRanked)
  const contextRanked = contextOf(thoughtsRanked)
  const context = pathToContext(contextRanked)

  const contextMeta = meta(state, thoughtsRanked)
  const sortPreference = getSortPreference(state, contextMeta)
  const children = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, thoughtsRanked)
  const notHidden = child => !isFunction(child.value) && !meta(state, pathToContext(thoughtsRanked).concat(child.value)).hidden
  const childrenFiltered = showHiddenThoughts ? children : children.filter(notHidden)
  const firstChild = childrenFiltered[0]
  const thoughtAfter = perma(() => nextSibling(state, value, context, rank))

  // TODO: Select previous uncle, great uncle, great great uncle, etc (recursive) next sibling
  // instead of selectNextEditable which uses the DOM
  // const nextUncle = perma(() => thoughtsRanked.length > 1 && nextSibling(context, contextOf(context), headRank(context)))

  const nextThoughtsRanked =
    // select first child
    firstChild ? unroot(thoughtsRanked.concat(firstChild))
    // select next sibling
    : thoughtAfter() ? unroot(contextOf(thoughtsRanked).concat(thoughtAfter()))
    // select next uncle
    // : nextUncle() ? unroot(contextOf(contextOf(thoughtsRanked)).concat(nextUncle()))
    // select next editable in DOM (See TODO)
    : selectNextEditable(target)

  if (nextThoughtsRanked) {
    dispatch({ type: 'setCursor', thoughtsRanked: nextThoughtsRanked })

    // if we are selecting a divider, remove browser selection from the previous thought
    if (isDivider(headValue(nextThoughtsRanked))) {
      document.getSelection().removeAllRanges()
    }
  }
}
