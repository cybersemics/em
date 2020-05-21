import { isMobile } from '../browser'

// constants
import {
  RANKED_ROOT,
} from '../constants'

// util
import {
  asyncFocus,
  contextOf,
  head,
  headValue,
  isFunction,
  pathToContext,
  perma,
  rootedContextOf,
  thoughtsEditingFromChain,
  unroot,
} from '../util'

// action-creators
import cursorBack from '../action-creators/cursorBack'

// selectors
import {
  getContextsSortedAndRanked,
  getSortPreference,
  getThoughtsRanked,
  getThoughtsSorted,
  isContextViewActive,
  lastThoughtsFromContextChain,
  meta,
  prevSibling,
  splitChain,
} from '../selectors'

/** Deletes a thought. */
const deleteThought = () => (dispatch, getState) => {

  const state = getState()
  const path = state.cursor

  // same as in newThought
  const contextChain = splitChain(state, path)
  const showContexts = isContextViewActive(state, contextOf(path))
  const thoughtsRanked = contextChain.length > 1
    ? lastThoughtsFromContextChain(state, contextChain)
    : path
  const context = pathToContext(showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContexts && thoughtsRanked.length > 1 ? contextOf(thoughtsRanked) :
    RANKED_ROOT)

  const contextMeta = meta(state, context)
  const sortPreference = getSortPreference(state, contextMeta)

  const { value, rank } = head(thoughtsRanked)
  const thoughts = pathToContext(thoughtsRanked)

  /** Calculates the previous context within a context view. */
  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(thoughtsRanked, state.contextViews)
    const contexts = showContexts && getContextsSortedAndRanked(state, headValue(thoughtsContextView))
    const removedContextIndex = contexts.findIndex(context => head(context.context) === value)
    const prevContext = contexts[removedContextIndex - 1]
    return prevContext && {
      value: head(prevContext.context),
      rank: prevContext.rank
    }
  }

  // prev must be calculated before dispatching existingThoughtDelete
  const prev = showContexts
    ? prevContext()
    : prevSibling(state, value, context, rank)

  /** Returns true when thought is not hidden due to being a function or having a =hidden attribute. */
  const isVisible = thoughtRanked => state.showHiddenThoughts || (
    !isFunction(thoughtRanked.value) &&
    !meta(state, context.concat(thoughtRanked.value)).hidden
  )

  // must call store.getState() to use the new state after existingThoughtDelete
  const next = perma(() => showContexts
    ? unroot(getContextsSortedAndRanked(state, headValue(contextOf(path))))[0]
    // get first visible thought
    : (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, context)
      .find(isVisible)
  )

  dispatch({
    type: 'existingThoughtDelete',
    context: contextOf(pathToContext(thoughtsRanked)),
    showContexts,
    thoughtRanked: head(thoughtsRanked),
  })

  if (isMobile && state.editing) {
    asyncFocus()
  }

  /** Sets the cursor or moves it back if it doesn't exist. */
  const setCursorOrBack = (thoughtsRanked, { offset } = {}) => {
    if (!thoughtsRanked) {
      dispatch(cursorBack())
    }
    else {
      dispatch({ type: 'setCursor', thoughtsRanked, editing: state.editing, offset })
    }
  }

  setCursorOrBack(...prev ? [contextOf(path).concat(prev), { offset: prev.value.length }] :
  // Case II: set cursor on next thought
    next() ? [showContexts
      ? contextOf(path).concat({ value: head(next().context), rank: next().rank })
      : contextOf(path).concat(next()), { offset: 0 }] :
    // Case III: delete last thought in context; set cursor on context
    thoughts.length > 1 ? [rootedContextOf(path), { offset: head(context).length }]
    // Case IV: delete very last thought; remove cursor
    : [null]
  )
}

export default deleteThought
