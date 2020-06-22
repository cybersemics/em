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
  head,
  headValue,
  isThoughtArchived,
  pathToArchive,
  pathToContext,
  reducerFlow,
  rootedContextOf,
  unroot,
} from '../util'

// selectors
import {
  getContextsSortedAndRanked,
  getThoughts,
  hasChild,
  isContextViewActive,
  lastThoughtsFromContextChain,
  nextSibling,
  prevSibling,
  splitChain,
  thoughtsEditingFromChain,
} from '../selectors'

// reducers
import {
  alert,
  existingThoughtDelete,
  existingThoughtMove,
  newThought,
  setCursor,
} from '../reducers'

/** Moves the thought to =archive. If the thought is already in =archive, permanently deletes it.
 *
 * @param path     Defaults to cursor.
 */
export default (state, { path } = {}) => {

  path = path || state.cursor

  if (!path) return state

  // same as in newThought
  const contextChain = splitChain(state, path)
  const showContexts = isContextViewActive(state, contextOf(path))
  const thoughtsRanked = contextChain.length > 1
    ? lastThoughtsFromContextChain(state, contextChain)
    : path
  const context = pathToContext(showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContexts && thoughtsRanked.length > 1 ? contextOf(thoughtsRanked) :
    RANKED_ROOT)

  const { value, rank } = head(thoughtsRanked)
  const thoughts = pathToContext(thoughtsRanked)

  const isEmpty = value === ''
  const isArchive = value === '=archive'
  const isArchived = isThoughtArchived(path)
  const hasDescendants = getThoughts(state, path).length !== 0
  const isDeletable = (isEmpty || isArchive || isArchived) && !hasDescendants

  /** Gets the previous sibling context in the context view. */
  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(state, thoughtsRanked)
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

  const next = !prev && showContexts
    ? unroot(getContextsSortedAndRanked(state, headValue(contextOf(path))))[0]
    // get first visible thought
    : nextSibling(state, value, context, rank)

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

  return reducerFlow([

    // set the cursor away from the current cursor before archiving so that existingThoughtMove does not move it
    state => setCursor(state, {
      thoughtsRanked: cursorNew,
      editing: state.editing,
      offset,
    }),

    isDeletable
      ? state => existingThoughtDelete(state, {
        context: contextOf(pathToContext(thoughtsRanked)),
        showContexts,
        thoughtRanked: head(thoughtsRanked),
      })
      : reducerFlow([

        // create =archive if it does not exist
        !hasChild(state, context, '=archive')
          ? state => newThought(state, {
            at: context,
            insertNewSubthought: true,
            insertBefore: true,
            value: '=archive',
            preventSetCursor: true
          })
          : null,

        // undo alert
        state => alert(state, {
          value: <div>Deleted "{ellipsize(headValue(path))}"&nbsp;
            <a onClick={() => {
              store.dispatch({
                type: 'undoArchive',
                originalPath: path,
                currPath: pathToArchive(state, path, context),
                offset
              })
            }}>Undo</a>
          </div>,
          // provide an alertType so the delete shortcut can null the alert after a delay
          alertType: 'undoArchive',
          showCloseLink: true,
        }),

        // execute existingThoughtMove after newThought has updated the state
        state => existingThoughtMove(state, {
          oldPath: path,
          newPath: pathToArchive(state, path, context),
          offset
        })
      ])
  ])(state)
}
