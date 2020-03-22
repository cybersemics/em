import { isMobile } from '../browser.js'
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
  restoreSelection,
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
    thoughtRanked: head(thoughtsRanked),
    showContexts,
  })

  // setCursor or restore selection if editing

  // encapsulate special cases for mobile and last thought
  const restore = (thoughtsRanked, options) => {
    if (!thoughtsRanked) {
      store.dispatch(cursorBack())
    }
    else if (!isMobile || state.editing) {
      asyncFocus()
      restoreSelection(thoughtsRanked, options)
    }
    else {
      store.dispatch({ type: 'setCursor', thoughtsRanked })
    }
  }

  restore(...(
    // Case I: restore selection to prev thought
    prev ? [contextOf(path).concat(prev), { offset: prev.value.length }] :
      // Case II: restore selection to next thought
      next() ? [showContexts
        ? contextOf(path).concat({ value: head(next().context), rank: next().rank })
        : contextOf(path).concat(next()), { offset: 0 }] :
        // Case III: delete last thought in context; restore selection to context
        thoughts.length > 1 ? [rootedContextOf(path), { offset: head(context).length }]
          // Case IV: delete very last thought; remove cursor
          : [null]
  ))
}
