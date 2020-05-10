import React from 'react'
import { isMobile } from '../browser'
import { store } from '../store'
import {
  RANKED_ROOT,
} from '../constants'

// util
import {
  asyncFocus,
  contextOf,
  ellipsize,
  getContextsSortedAndRanked,
  head,
  headValue,
  isContextViewActive,
  isThoughtArchived,
  lastThoughtsFromContextChain,
  meta,
  nextSibling,
  pathToArchive,
  pathToContext,
  prevSibling,
  rootedContextOf,
  splitChain,
  thoughtsEditingFromChain,
  unroot,
} from '../util'

// action-creators
import { newThought } from '../action-creators/newThought'
import alert from '../action-creators/alert'
import { undoArchive } from '../action-creators/undoArchive'

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

  const contextMeta = meta(context)

  const { value, rank } = head(thoughtsRanked)
  const thoughts = pathToContext(thoughtsRanked)

  const isEmpty = value === ''
  const isArchive = value === '=archive'
  const isArchived = isThoughtArchived(path)
  const isDeletable = isEmpty || isArchive || isArchived

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

  const next = !prev && showContexts
    ? unroot(getContextsSortedAndRanked(headValue(contextOf(path))))[0]
    // get first visible thought
    : nextSibling(value, context, rank)

  const [cursorNew, offset] =
    // Case I: set cursor on prev thought
    prev ? [contextOf(path).concat(prev), prev.value.length] :
    // Case II: set cursor on next thought
    next ? [showContexts
      ? contextOf(path).concat({ value: head(next.context), rank: next.rank })
      : contextOf(path).concat(next), 0] :
    // Case III: delete last thought in context; set cursor on context
    thoughts.length > 1 ? [rootedContextOf(path), head(context).length]
    // Case IV: delete very last thought; remove cursor
    : [null]

  if (isMobile && state.editing) {
    asyncFocus()
  }

  // set the cursor away from the current cursor before archiving so that existingThoughtMove does not move it
  store.dispatch({
    type: 'setCursor',
    thoughtsRanked: cursorNew,
    editing: state.editing,
    offset,
  })

  if (isDeletable) {
    store.dispatch({
      type: 'existingThoughtDelete',
      context: contextOf(pathToContext(thoughtsRanked)),
      showContexts,
      thoughtRanked: head(thoughtsRanked),
    })
  }
  else {
    if (!contextMeta.archive) {
      store.dispatch(newThought({ at: context, insertNewSubthought: true, insertBefore: true, value: '=archive', preventSetCursor: true }))
    }
    alert((
      <div>Deleted "{ellipsize(headValue(path))}."&nbsp;
        <a onClick={() => {
          store.dispatch(undoArchive({ originalPath: path, currPath: pathToArchive(path, context), offset }))
        }}>Undo</a>
      </div>
    ))
    setTimeout(() => alert(null), 10000)
    store.dispatch({
      type: 'existingThoughtMove',
      oldPath: path,
      newPath: pathToArchive(path, context),
      offset
    })
  }
}
