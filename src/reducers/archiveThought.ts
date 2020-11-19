import _ from 'lodash'
import { isMobile } from '../browser'
import { RANKED_ROOT } from '../constants'
import { State } from '../util/initialState'
import { Child, Path, SimplePath, ThoughtContext } from '../types'

// util
import {
  asyncFocus,
  parentOf,
  ellipsize,
  head,
  headValue,
  isDivider,
  isThoughtArchived,
  pathToArchive,
  pathToContext,
  reducerFlow,
  rootedParentOf,
  unroot,
} from '../util'

// selectors
import {
  getContextsSortedAndRanked,
  getAllChildren,
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
const archiveThought = (state: State, { path }: { path: Path }): State => {

  path = path || state.cursor

  if (!path) return state

  // same as in newThought
  const showContexts = isContextViewActive(state, parentOf(pathToContext(path)))
  const contextChain = splitChain(state, path)
  const simplePath = contextChain.length > 1
    ? lastThoughtsFromContextChain(state, contextChain)
    : path as SimplePath
  const pathParent = showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 1]
    : !showContexts && simplePath.length > 1 ? parentOf(simplePath) :
    RANKED_ROOT
  const context = pathToContext(pathParent)
  const { value, rank } = head(simplePath)
  const thoughts = pathToContext(simplePath)

  const isEmpty = value === ''
  const isArchive = value === '=archive'
  const isArchived = isThoughtArchived(path)
  const hasDescendants = getAllChildren(state, pathToContext(path)).length !== 0
  const isDeletable = (isEmpty && !hasDescendants) || isArchive || isArchived || isDivider(value)

  /** Gets the previous sibling context in the context view. */
  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(state, path)
    const contexts = showContexts ? getContextsSortedAndRanked(state, headValue(thoughtsContextView)) : []
    const contextsFiltered = contexts.filter(({ context }) => head(context) !== '=archive')
    const removedContextIndex = contextsFiltered.findIndex(({ context }) => head(context) === headValue(path))
    const prevContext = contextsFiltered[removedContextIndex - 1]
    return prevContext && {
      value: head(prevContext.context),
      rank: removedContextIndex - 1
    }
  }

  /** Gets the next sibling context in the context view. */
  const nextContext = (): ThoughtContext => {
    const thoughtsContextView = thoughtsEditingFromChain(state, path)
    const contexts = showContexts ? getContextsSortedAndRanked(state, headValue(thoughtsContextView)) : []
    const contextsFiltered = contexts.filter(({ context }) => head(context) !== '=archive')
    const removedContextIndex = contextsFiltered.findIndex(({ context }) => head(context) === headValue(path))
    const nextContext = contextsFiltered[removedContextIndex + 1]
    return nextContext && {
      ...contextsFiltered[removedContextIndex + 1],
      rank: removedContextIndex + 1
    }
  }

  // prev must be calculated before dispatching existingThoughtDelete
  const prev = showContexts
    ? prevContext()
    : prevSibling(state, value, context, rank)

  const next = !prev && showContexts
    ? nextContext()
    // get first visible thought
    : nextSibling(state, value, context, rank)
  const [cursorNew, offset]: [Path | null, number | undefined] =
    // Case I: set cursor on prev thought
    prev ? [parentOf(path).concat(prev), prev.value.length] :
    // Case II: set cursor on next thought
    next ? [unroot(showContexts
      ? parentOf(path).concat({ value: head((next as ThoughtContext).context), rank: next.rank })
      : parentOf(path).concat(next as Child)), 0] :
    // Case III: delete last thought in context; set cursor on context
    thoughts.length > 1 ? [rootedParentOf(path), head(context).length]
    // Case IV: delete very last thought; remove cursor
    : [null, undefined]

  if (isMobile && state.editing) {
    asyncFocus()
  }

  return reducerFlow([
    ...isDeletable
      ? [
        // set the cursor away from the current cursor before archiving so that existingThoughtMove does not move it
        setCursor({
          path: cursorNew,
          editing: state.editing,
          offset,
        }),
        existingThoughtDelete({
          context: showContexts ? context : parentOf(pathToContext(simplePath)),
          showContexts,
          thoughtRanked: head(simplePath),
        })]
      : [
        // create =archive if it does not exist
        (state: State) => !hasChild(state, context, '=archive')
          ? newThought(state, {
            at: pathParent,
            insertNewSubthought: true,
            insertBefore: true,
            value: '=archive',
            preventSetCursor: true
          })
          : null,
        setCursor({
          path: cursorNew,
          editing: state.editing,
          offset,
        }),

        // undo alert
        alert({
          value: `Deleted ${ellipsize(headValue(showContexts ? simplePath : path))}`,
          // provide an alertType so the delete shortcut can null the alert after a delay
          alertType: 'undoArchive',
          showCloseLink: true,
        }),

        // execute existingThoughtMove after newThought has updated the state
        (state: State) => {
          return existingThoughtMove(state, {
            oldPath: showContexts ? simplePath : path,
            // TODO: Are we sure pathToArchive cannot return null?
            newPath: pathToArchive(state, showContexts ? simplePath : path, context)!,
            offset
          })
        }
      ]
  ])(state)
}

export default _.curryRight(archiveThought)
