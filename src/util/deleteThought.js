import { isMobile } from '../browser'
import { store } from '../store.js'
import {
  RANKED_ROOT,
} from '../constants.js'

// util
import {
  asyncFocus,
  contextOf,
  getContextsSortedAndRanked,
  getThoughtsRanked,
  getThoughtsSorted,
  getSortPreference,
  head,
  headValue,
  isContextViewActive,
  lastThoughtsFromContextChain,
  meta,
  pathToContext,
  perma,
  prevSibling,
  rootedContextOf,
  splitChain,
  thoughtsEditingFromChain,
  unroot,
} from '../util.js'

// action-creators
import { cursorBack } from '../action-creators/cursorBack'

export const deleteThought = () => {

  const state = store.getState()
  const path = state.cursor

  // same as in newThought
  const contextChain = splitChain(path, state.contextViews)
  const showContexts = isContextViewActive(contextOf(path), { state })
  const thoughtsRanked = contextChain.length > 1
    ? lastThoughtsFromContextChain(contextChain)
    : path
  const context = pathToContext(showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContexts && thoughtsRanked.length > 1 ? contextOf(thoughtsRanked) :
    RANKED_ROOT)

  const contextMeta = meta(context)
  const sortPreference = getSortPreference(contextMeta)

  const { value, rank } = head(thoughtsRanked)
  const thoughts = pathToContext(thoughtsRanked)

  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(thoughtsRanked, state.contextViews)
    const contexts = showContexts && getContextsSortedAndRanked(headValue(thoughtsContextView))
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

  const next = perma(() =>
    showContexts
      ? unroot(getContextsSortedAndRanked(headValue(contextOf(path))))[0]
      : sortPreference === 'Alphabetical' ? getThoughtsSorted(context)[1] : getThoughtsRanked(context)[0]
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
      store.dispatch({ type: 'setCursor', thoughtsRanked: prev ? thoughtsRanked : [thoughtsRanked[0]], editing: state.editing, offset })
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
