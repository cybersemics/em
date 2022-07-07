import _ from 'lodash'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtContext from '../@types/ThoughtContext'
import ThoughtId from '../@types/ThoughtId'
import { HOME_PATH } from '../constants'
// reducers
import alert from '../reducers/alert'
import deleteThought from '../reducers/deleteThought'
import moveThought from '../reducers/moveThought'
import newThought from '../reducers/newThought'
import setCursor from '../reducers/setCursor'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren, getAllChildrenAsThoughts } from '../selectors/getChildren'
// selectors
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getPrevRank from '../selectors/getPrevRank'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import lastThoughtsFromContextChain from '../selectors/lastThoughtsFromContextChain'
import nextSibling from '../selectors/nextSibling'
import parentOfThought from '../selectors/parentOfThought'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import splitChain from '../selectors/splitChain'
import thoughtsEditingFromChain from '../selectors/thoughtsEditingFromChain'
// util
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import equalThoughtValue from '../util/equalThoughtValue'
import head from '../util/head'
import headValue from '../util/headValue'
import isDivider from '../util/isDivider'
import isThoughtArchived from '../util/isThoughtArchived'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'

/** Returns path to the archive of the given context. */
export const pathAndRankToArchive = (
  state: State,
  path: Path,
  pathParent: Path,
): {
  path: Path
  rank: number
} | null => {
  const rankedArchive = getAllChildrenAsThoughts(state, head(pathParent)).find(equalThoughtValue('=archive'))
  if (!rankedArchive) return null
  const archivePath = rankedArchive ? appendToPath(parentOf(path), rankedArchive.id) : parentOf(path)
  const newRank = getPrevRank(state, head(archivePath))
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
  const showContexts = isContextViewActive(state, rootedParentOf(state, path))
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
    console.error(`achiveThought: Thought not found for id ${head(simplePath)}`)
  }
  const { value, rank } = thought
  const thoughts = pathToContext(state, simplePath)

  const isEmpty = value === ''
  const isArchive = value === '=archive'
  const isArchived = isThoughtArchived(state, path)
  const hasDescendants = getAllChildren(state, head(path)).length !== 0
  const allChildren = getAllChildrenAsThoughts(state, head(simplePath))
  const isDeletable = (isEmpty && !hasDescendants) || isArchive || isArchived || isDivider(value)
  const alertLabel = ellipsize(value === '=note' ? 'note ' + allChildren[0]?.value || '' : value)

  /** Gets the previous sibling context in the context view. */
  const prevContext = () => {
    const thoughtsContextView = thoughtsEditingFromChain(state, path)
    const contexts = showContexts ? getContextsSortedAndRanked(state, headValue(state, thoughtsContextView)) : []
    const contextsFiltered = contexts.filter(({ id }) => {
      const parentThought = parentOfThought(state, id)
      return parentThought?.value !== '=archive'
    })
    const removedThoughtIndex = contextsFiltered.findIndex(({ id }) => {
      const parentThought = parentOfThought(state, id)
      return parentThought?.value === headValue(state, path)
    })

    const prevContext = contextsFiltered[removedThoughtIndex - 1]
    return prevContext
  }

  /** Gets the next sibling context in the context view. */
  const nextContext = (): ThoughtContext => {
    const thoughtsContextView = thoughtsEditingFromChain(state, path)
    const contexts = showContexts ? getContextsSortedAndRanked(state, headValue(state, thoughtsContextView)) : []
    const contextsFiltered = contexts.filter(({ id }) => {
      const parentThought = parentOfThought(state, id)
      return parentThought?.value !== '=archive'
    })
    const removedThoughtIndex = contextsFiltered.findIndex(({ id }) => {
      const parentThought = parentOfThought(state, id)
      return parentThought?.value === headValue(state, path)
    })
    const nextContext = contextsFiltered[removedThoughtIndex + 1]
    return nextContext.id
  }

  // prev must be calculated before dispatching deleteThought
  const prev = showContexts ? prevContext() : prevSibling(state, value, pathParent, rank)

  const next =
    !prev && showContexts
      ? nextContext()
      : // get first visible thought
        nextSibling(state, head(pathParent), value, rank)?.id

  const [cursorNew, offset]: [Path | null, number | undefined] =
    // Case I: set cursor on prev thought
    prev
      ? // TODO: Fix offset here
        [appendToPath(parentOf(path), prev.id), 0]
      : // Case II: set cursor on next thought
      next
      ? [unroot(showContexts ? appendToPath(parentOf(path), next) : appendToPath(parentOf(path), next as ThoughtId)), 0]
      : // Case III: delete last thought in context; set cursor on context
      thoughts.length > 1
      ? [rootedParentOf(state, path), head(context).length]
      : // Case IV: delete very last thought; remove cursor
        [null, undefined]

  return reducerFlow([
    ...(isDeletable
      ? [
          deleteThought({
            pathParent: showContexts ? simplePath : parentOf(simplePath),
            showContexts,
            thoughtId: head(simplePath),
          }),
        ]
      : [
          // create =archive if it does not exist
          (state: State) =>
            !findDescendant(state, head(pathParent), '=archive')
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
            const { path: newPath, rank } = pathAndRankToArchive(state, showContexts ? simplePath : path!, pathParent)!
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
