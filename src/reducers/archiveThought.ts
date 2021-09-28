import _ from 'lodash'
import { HOME_PATH } from '../constants'
import { Child, Context, Path, SimplePath, State, ThoughtContext } from '../@types'

// util
import {
  appendToPath,
  ellipsize,
  equalThoughtValue,
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
  hasChild,
  isContextViewActive,
  lastThoughtsFromContextChain,
  nextSibling,
  rootedParentOf,
  prevSibling,
  splitChain,
  thoughtsEditingFromChain,
  getParentThought,
  getPrevRank,
  getThoughtById,
} from '../selectors'

// reducers
import { alert, deleteThought, moveThought, newThought, setCursor } from '../reducers'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Returns path to the archive of the given context. */
export const pathAndRankToArchive = (
  state: State,
  path: Path,
  context: Context,
): {
  path: Path
  rank: number
} | null => {
  const rankedArchive = getAllChildrenAsThoughts(state, context).find(equalThoughtValue('=archive'))
  if (!rankedArchive) return null
  const archivePath = rankedArchive ? appendToPath(parentOf(path), rankedArchive.id) : parentOf(path)
  const newRank = getPrevRank(state, pathToContext(state, archivePath))
  return {
    path: [...parentOf(path), rankedArchive.id, head(path)],
    rank: newRank,
  }
}

/** Moves the thought to =archive. If the thought is already in =archive, permanently deletes it.
 *
 * @param path     Defaults to cursor.
 */
const archiveThought = (state: State, options: { path?: Path }): State => {
  const path = options.path || state.cursor

  if (!path) return state

  // same as in newThought
  const showContexts = isContextViewActive(state, parentOf(pathToContext(state, path)))
  const contextChain = splitChain(state, path)
  const simplePath = contextChain.length > 1 ? lastThoughtsFromContextChain(state, contextChain) : (path as SimplePath)
  const pathParent =
    showContexts && contextChain.length > 1
      ? contextChain[contextChain.length - 1]
      : !showContexts && simplePath.length > 1
      ? parentOf(simplePath)
      : HOME_PATH
  const context = pathToContext(state, pathParent)
  const thought = getThoughtById(state, head(simplePath))

  if (!thought) {
    console.error(`achiveThought: Parent entry not found for id${head(simplePath)}!`)
  }
  const { value, rank } = thought
  const thoughts = pathToContext(state, simplePath)

  const isEmpty = value === ''
  const isArchive = value === '=archive'
  const isArchived = isThoughtArchived(state, path)
  const hasDescendants = getAllChildren(state, pathToContext(state, path)).length !== 0
  const allChildren = getAllChildrenAsThoughts(state, thoughts)
  const isDeletable = (isEmpty && !hasDescendants) || isArchive || isArchived || isDivider(value)
  const alertLabel = ellipsize(value === '=note' ? 'note ' + allChildren[0]?.value || '' : value)

  /** Gets the previous sibling context in the context view. */
  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(state, path)
    const contexts = showContexts ? getContextsSortedAndRanked(state, headValue(state, thoughtsContextView)) : []
    const contextsFiltered = contexts.filter(({ id }) => {
      const parentThought = getParentThought(state, id)
      return parentThought?.value !== '=archive'
    })
    const removedContextIndex = contextsFiltered.findIndex(({ id }) => {
      const parentThought = getParentThought(state, id)
      return parentThought?.value === headValue(state, path)
    })

    const prevContext = contextsFiltered[removedContextIndex - 1]
    return prevContext
  }

  /** Gets the next sibling context in the context view. */
  const nextContext = (): ThoughtContext => {
    const thoughtsContextView = thoughtsEditingFromChain(state, path)
    const contexts = showContexts ? getContextsSortedAndRanked(state, headValue(state, thoughtsContextView)) : []
    const contextsFiltered = contexts.filter(({ id }) => {
      const parentThought = getParentThought(state, id)
      return parentThought?.value !== '=archive'
    })
    const removedContextIndex = contextsFiltered.findIndex(({ id }) => {
      const parentThought = getParentThought(state, id)
      return parentThought?.value === headValue(state, path)
    })
    const nextContext = contextsFiltered[removedContextIndex + 1]
    return nextContext.id
  }

  // prev must be calculated before dispatching deleteThought
  const prev = showContexts ? prevContext() : prevSibling(state, value, context, rank)

  const next =
    !prev && showContexts
      ? nextContext()
      : // get first visible thought
        nextSibling(state, value, context, rank)?.id

  const [cursorNew, offset]: [Path | null, number | undefined] =
    // Case I: set cursor on prev thought
    prev
      ? // TODO: Fix offset here
        [appendToPath(parentOf(path), prev.id), 0]
      : // Case II: set cursor on next thought
      next
      ? [unroot(showContexts ? appendToPath(parentOf(path), next) : appendToPath(parentOf(path), next as Child)), 0]
      : // Case III: delete last thought in context; set cursor on context
      thoughts.length > 1
      ? [rootedParentOf(state, path), head(context).length]
      : // Case IV: delete very last thought; remove cursor
        [null, undefined]

  return reducerFlow([
    ...(isDeletable
      ? [
          deleteThought({
            context: showContexts ? context : parentOf(pathToContext(state, simplePath)),
            showContexts,
            thoughtId: head(simplePath),
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
            value: `Archived ${alertLabel}`,
            // provide an alertType so the delete shortcut can null the alert after a delay
            alertType: 'undoArchive',
            showCloseLink: true,
          }),

          // execute moveThought after newThought has updated the state
          (state: State) => {
            const { path: newPath, rank } = pathAndRankToArchive(state, showContexts ? simplePath : path!, context)!
            return moveThought(state, {
              oldPath: path,
              // TODO: Are we sure pathToArchive cannot return null?
              newPath: newPath!,
              offset,
              newRank: rank,
            })
          },
        ]),

    setCursor({
      path: cursorNew,
      editing: state.editing,
      offset,
    }),
  ])(state)
}

export default _.curryRight(archiveThought)
