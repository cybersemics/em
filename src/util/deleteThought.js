import { isMobile } from '../browser'
import { store } from '../store'
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
  meta,
  pathToContext,
  perma,
  prevSibling,
  rootedContextOf,
  splitChain,
  thoughtsEditingFromChain,
  unroot,
} from '../util'

// action-creators
import { cursorBack } from '../action-creators/cursorBack'

// selectors
import { getContextsSortedAndRanked, getSortPreference, isContextViewActive, lastThoughtsFromContextChain } from '../selectors'
import getThoughtsRanked from '../selectors/getThoughtsRanked'
import getThoughtsSorted from '../selectors/getThoughtsSorted'

export const deleteThought = () => {

  const state = store.getState()
  const path = state.cursor

  // same as in newThought
  const contextChain = splitChain(path, state.contextViews)
  const showContexts = isContextViewActive(state, contextOf(path))
  const thoughtsRanked = contextChain.length > 1
    ? lastThoughtsFromContextChain(state, contextChain)
    : path
  const context = pathToContext(showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContexts && thoughtsRanked.length > 1 ? contextOf(thoughtsRanked) :
    RANKED_ROOT)

  const contextMeta = meta(context)
  const sortPreference = getSortPreference(state, contextMeta)

  const { value, rank } = head(thoughtsRanked)
  const thoughts = pathToContext(thoughtsRanked)

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
    : prevSibling(value, context, rank)

  // returns true when thought is not hidden due to being a function or having a =hidden attribute
  const isVisible = thoughtRanked => state.showHiddenThoughts || (
    !isFunction(thoughtRanked.value) &&
    !meta(context.concat(thoughtRanked.value)).hidden
  )

  // must call store.getState() to use the new state after existingThoughtDelete
  const next = perma(() => showContexts
    ? unroot(getContextsSortedAndRanked(state, headValue(contextOf(path))))[0]
    // get first visible thought
    : (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(store.getState(), context)
      .find(isVisible)
  )

  store.dispatch({
    type: 'existingThoughtDelete',
    context: contextOf(pathToContext(thoughtsRanked)),
    showContexts,
    thoughtRanked: head(thoughtsRanked),
  })

  if (isMobile && state.editing) {
    asyncFocus()
  }

  // encapsulate special cases for last thought
  const setCursorOrBack = (thoughtsRanked, { offset } = {}) => {
    if (!thoughtsRanked) {
      store.dispatch(cursorBack())
    }
    else {
      store.dispatch({ type: 'setCursor', thoughtsRanked, editing: state.editing, offset })
    }
  }

  setCursorOrBack(...(
    // Case I: set cursor on prev thought
    prev ? [contextOf(path).concat(prev), { offset: prev.value.length }] :
    // Case II: set cursor on next thought
    next() ? [showContexts
      ? contextOf(path).concat({ value: head(next().context), rank: next().rank })
      : contextOf(path).concat(next()), { offset: 0 }] :
    // Case III: delete last thought in context; set cursor on context
    thoughts.length > 1 ? [rootedContextOf(path), { offset: head(context).length }]
    // Case IV: delete very last thought; remove cursor
    : [null]
  ))
}
