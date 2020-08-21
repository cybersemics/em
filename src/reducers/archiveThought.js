import _ from 'lodash'
import { isMobile } from '../browser'
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
  isDivider,
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
  splitChain,g
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
const archiveThought = (state, { path }) => {

  path = path || state.cursor

  if (!path) return state

  // same as in newThought
  const showContexts = isContextViewActive(state, contextOf(path))
  const contextChain = splitChain(state, path)
  const thoughtsRanked = contextChain.length > 1
    ? lastThoughtsFromContextChain(state, contextChain)
    : path
  const context = pathToContext(showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 1]
    : !showContexts && thoughtsRanked.length > 1 ? contextOf(thoughtsRanked) :
    RANKED_ROOT)
  const { value, rank } = head(thoughtsRanked)
  const thoughts = pathToContext(thoughtsRanked)

  const isEmpty = value === ''
  const isArchive = value === '=archive'
  const isArchived = isThoughtArchived(path)
  const hasDescendants = getThoughts(state, path).length !== 0
  const isDeletable = (isEmpty && !hasDescendants) || isArchive || isArchived || isDivider(value)

  /** Gets the previous sibling context in the context view. */
  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(state, path)
    const contexts = showContexts && getContextsSortedAndRanked(state, headValue(thoughtsContextView))
    const contextsFiltered = contexts.filter(({ context }) => head(context) !== '=archive')
    const removedContextIndex = contextsFiltered.findIndex(({ context }) => head(context) === headValue(path))
    const prevContext = contextsFiltered[removedContextIndex - 1]
    return prevContext && {
      value: head(prevContext.context),
      rank: removedContextIndex - 1
    }
  }

  /** Gets the next sibling context in the context view. */
  const nextContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(state, path)
    const contexts = showContexts && getContextsSortedAndRanked(state, headValue(thoughtsContextView))
    const contextsFiltered = contexts.filter(({ context }) => head(context) !== '=archive')
    const removedContextIndex = contextsFiltered.findIndex(({ context }) => head(context) === headValue(path))
    const nextContext = contextsFiltered[removedContextIndex + 1]
    return nextContext && Object.assign({}, contextsFiltered[removedContextIndex + 1], { rank: removedContextIndex + 1 })
  }

  // prev must be calculated before dispatching existingThoughtDelete
  const prev = showContexts
    ? prevContext()
    : prevSibling(state, value, context, rank)

  const next = !prev && showContexts
    ? nextContext()
    // get first visible thought
    : nextSibling(state, value, context, rank)
  const [cursorNew, offset] =
    // Case I: set cursor on prev thought
    prev ? [contextOf(path).concat(prev), prev.value.length] :
    // Case II: set cursor on next thought
    next ? [unroot(showContexts
      ? contextOf(path).concat({ value: head(next.context), rank: next.rank })
      : contextOf(path).concat(next)), 0] :
    // Case III: delete last thought in context; set cursor on context
    thoughts.length > 1 ? [rootedContextOf(path), head(context).length]
    // Case IV: delete very last thought; remove cursor
    : [null]

  if (isMobile && state.editing) {
    asyncFocus()
  }
  return reducerFlow([

    // set the cursor away from the current cursor before archiving so that existingThoughtMove does not move it
    setCursor({
      thoughtsRanked: cursorNew,
      editing: state.editing,
      offset,
    }),

    isDeletable
      ? existingThoughtDelete({
        context: showContexts ? context : contextOf(pathToContext(thoughtsRanked)),
        showContexts,
        thoughtRanked: head(thoughtsRanked),
      })
      : reducerFlow([

        // create =archive if it does not exist
        state => !hasChild(state, context, '=archive')
          ? newThought(state, {
            at: context,
            insertNewSubthought: true,
            insertBefore: true,
            value: '=archive',
            preventSetCursor: true
          })
          : null,

        // undo alert
        alert({
          value: `Deleted ${ellipsize(headValue(showContexts ? thoughtsRanked : path))}`,
          // provide an alertType so the delete shortcut can null the alert after a delay
          alertType: 'undoArchive',
          showCloseLink: true,
        }),

        // execute existingThoughtMove after newThought has updated the state
        state => existingThoughtMove(state, {
          oldPath: showContexts ? thoughtsRanked : path,
          newPath: pathToArchive(state, showContexts ? thoughtsRanked : path, context),
          offset
        })
      ])
  ])(state)
}

export default _.curryRight(archiveThought)
