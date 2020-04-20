import { isMobile } from '../browser'
import { store } from '../store'
import {
  RANKED_ROOT,
} from '../constants'

// util
import {
  asyncFocus,
  contextOf,
  getContextsSortedAndRanked,
  getThoughtsRanked,
  getThoughtsSorted,
  getSortPreference,
  getRankAfter,
  getThought,
  head,
  headValue,
  isContextViewActive,
  isFunction,
  isRoot,
  lastThoughtsFromContextChain,
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

import { contextArchive } from './contextArchive.js'

export const archiveThought = () => {

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

  const archive = contextArchive(context)
  console.log('archive', archive)
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

  // returns true when thought is not hidden due to being a function or having a =hidden attribute
  const isVisible = thoughtRanked => state.showHiddenThoughts || (
    !isFunction(thoughtRanked.value) &&
    !meta(context.concat(thoughtRanked.value)).hidden
  )

  const next = perma(() => showContexts
    ? unroot(getContextsSortedAndRanked(headValue(contextOf(path))))[0]
    // get first visible thought
    : (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(context)
      .find(isVisible)
  )

  if (isRoot(context)) {
    store.dispatch({
      type: 'existingThoughtDelete',
      context: contextOf(pathToContext(thoughtsRanked)),
      showContexts,
      thoughtRanked: head(thoughtsRanked),
    })
  }
  else {
    const cursorNew = unroot(rootedContextOf(contextOf(path)).concat({
      value: headValue(path),
      rank: getRankAfter(contextOf(path))
    }))
    const offset = window.getSelection().focusOffset
    console.log('cursorNew', cursorNew)
    console.log('offset', offset)
    console.log('path', path)
    console.log('getThought', getThought('=archive'))
    console.log('thoughtIndex', state.thoughtIndex)
    // store.dispatch({
    //   type: 'existingThoughtMove',
    //   oldPath: path,
    //   newPath: cursorNew,
    //   offset
    // })
  }

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
