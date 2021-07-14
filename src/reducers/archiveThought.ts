import _ from 'lodash'
import { HOME_PATH } from '../constants'
import { Child, Context, Path, SimplePath, State, ThoughtContext } from '../@types'

// util
import {
  appendToPath,
  ellipsize,
  equalThoughtValue,
  hashContext,
  head,
  headValue,
  isDivider,
  isThoughtArchived,
  parentOf,
  pathToContext,
  reducerFlow,
  unroot,
} from '../util'

// selectors
import {
  getAllChildren,
  getContextsSortedAndRanked,
  getPrevRank,
  hasChild,
  isContextViewActive,
  lastThoughtsFromContextChain,
  nextSibling,
  rootedParentOf,
  prevSibling,
  splitChain,
  thoughtsEditingFromChain,
} from '../selectors'

// reducers
import { alert, deleteThought, moveThought, newThought, setCursor } from '../reducers'

/** Returns path to the archive of the given context. */
export const pathToArchive = (state: State, path: Path, context: Context): Path | null => {
  const rankedArchive = getAllChildren(state, context).find(equalThoughtValue('=archive'))
  if (!rankedArchive) return null
  const archivePath = rankedArchive ? appendToPath(parentOf(path), rankedArchive) : parentOf(path)
  const newRank = getPrevRank(state, pathToContext(archivePath))
  return [...parentOf(path), rankedArchive, { ...head(path), rank: newRank }]
}

/** Moves the thought to =archive. If the thought is already in =archive, permanently deletes it.
 *
 * @param path     Defaults to cursor.
 */
const archiveThought = (state: State, options: { path?: Path }): State => {
  const path = options.path || state.cursor

  if (!path) return state

  // same as in newThought
  const showContexts = isContextViewActive(state, parentOf(pathToContext(path)))
  const contextChain = splitChain(state, path)
  const simplePath = contextChain.length > 1 ? lastThoughtsFromContextChain(state, contextChain) : (path as SimplePath)
  const pathParent =
    showContexts && contextChain.length > 1
      ? contextChain[contextChain.length - 1]
      : !showContexts && simplePath.length > 1
      ? parentOf(simplePath)
      : HOME_PATH
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
    return (
      prevContext && {
        value: head(prevContext.context),
        rank: removedContextIndex - 1,
      }
    )
  }

  /** Gets the next sibling context in the context view. */
  const nextContext = (): ThoughtContext => {
    const thoughtsContextView = thoughtsEditingFromChain(state, path)
    const contexts = showContexts ? getContextsSortedAndRanked(state, headValue(thoughtsContextView)) : []
    const contextsFiltered = contexts.filter(({ context }) => head(context) !== '=archive')
    const removedContextIndex = contextsFiltered.findIndex(({ context }) => head(context) === headValue(path))
    const nextContext = contextsFiltered[removedContextIndex + 1]
    return (
      nextContext && {
        ...contextsFiltered[removedContextIndex + 1],
        rank: removedContextIndex + 1,
      }
    )
  }

  // prev must be calculated before dispatching deleteThought
  const prev = showContexts ? prevContext() : prevSibling(state, value, context, rank)

  const next =
    !prev && showContexts
      ? nextContext()
      : // get first visible thought
        nextSibling(state, value, context, rank)

  const parentPath = parentOf(path)

  const [cursorNew, offset]: [Path | null, number | undefined] =
    // Case I: set cursor on prev thought
    prev
      ? [
          appendToPath(parentOf(path), {
            ...prev,
            id: hashContext(unroot([...pathToContext(parentPath), prev.value])),
          }),
          prev.value.length,
        ]
      : // Case II: set cursor on next thought
      next
      ? [
          unroot(
            showContexts
              ? appendToPath(parentOf(path), {
                  id: hashContext(unroot([...pathToContext(parentPath), head((next as ThoughtContext).context)])),
                  value: head((next as ThoughtContext).context),
                  rank: next.rank,
                })
              : appendToPath(parentOf(path), next as Child),
          ),
          0,
        ]
      : // Case III: delete last thought in context; set cursor on context
      thoughts.length > 1
      ? [rootedParentOf(state, path), head(context).length]
      : // Case IV: delete very last thought; remove cursor
        [null, undefined]

  return reducerFlow([
    ...(isDeletable
      ? [
          deleteThought({
            context: showContexts ? context : parentOf(pathToContext(simplePath)),
            showContexts,
            thoughtRanked: head(simplePath),
          }),
        ]
      : [
          // create =archive if it does not exist
          (state: State) =>
            !hasChild(state, context, '=archive')
              ? newThought(state, {
                  at: pathParent,
                  insertNewSubthought: true,
                  insertBefore: true,
                  value: '=archive',
                  preventSetCursor: true,
                })
              : null,

          // undo alert
          alert({
            value: `Archived ${ellipsize(headValue(showContexts ? simplePath : path))}`,
            // provide an alertType so the delete shortcut can null the alert after a delay
            alertType: 'undoArchive',
            showCloseLink: true,
          }),

          // execute moveThought after newThought has updated the state
          (state: State) =>
            moveThought(state, {
              oldPath: path,
              // TODO: Are we sure pathToArchive cannot return null?
              newPath: pathToArchive(state, showContexts ? simplePath : path!, context)!,
              offset,
            }),
        ]),

    setCursor({
      path: cursorNew,
      editing: state.editing,
      offset,
    }),
  ])(state)
}

export default _.curryRight(archiveThought)
