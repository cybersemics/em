import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import Thunk from '../@types/Thunk'
import { HOME_TOKEN } from '../constants'
import { clientId } from '../data-providers/yjs'
import { getLexeme } from '../selectors/getLexeme'
import getNextRank from '../selectors/getNextRank'
import getThoughtById from '../selectors/getThoughtById'
import appendToPath from '../util/appendToPath'
import equalPath from '../util/equalPath'
import hashThought from '../util/hashThought'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'
import normalizeThought from '../util/normalizeThought'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import removeContext from '../util/removeContext'
import timestamp from '../util/timestamp'
import moveThought from './moveThought'
import updateThoughts from './updateThoughts'

/**
 * Merges two given thoughts with the same value by moving all the children of the source thought to the end of the desination thought.
 */
const mergeThoughts = (
  state: State,
  {
    sourceThoughtPath,
    targetThoughtPath,
  }: {
    sourceThoughtPath: Path
    targetThoughtPath: Path
  },
): State => {
  const sourceThought = getThoughtById(state, head(sourceThoughtPath))
  const targetThought = getThoughtById(state, head(targetThoughtPath))

  if (!sourceThought) {
    console.warn(`Missing sourceThought${head(sourceThoughtPath)}. Aborting merge.`)
    return state
  }

  // fallback to the parent in sourceThoughtPath if sourceThought.parentId does not have a corresponding thought
  // in multi-step move and merge, outdated thoughts may be reconciled into state before merge is complete
  // if no parent thought can be found, warn and safely exit
  const sourceParentThought =
    getThoughtById(state, sourceThought.parentId) || getThoughtById(state, head(parentOf(sourceThoughtPath)))
  if (!sourceParentThought) {
    console.warn(
      `mergeThoughts: sourceParentThought not found. Missing thought for both sourceThought.parentId of ${
        sourceThought.parentId
      } and head(parentof(sourceThoughtPath)) of ${head(parentOf(sourceThoughtPath))}. Aborting merge.`,
    )
    console.info('  sourceThought', sourceThought)
    console.info('  sourceThoughtPath', sourceThoughtPath)
    return state
  }

  if (sourceThought.id === targetThought.id) {
    if (sourceThoughtPath.length === targetThoughtPath.length) {
      throw new Error('Cannot merge a thought to itself.')
    } else {
      console.warn(
        'A thought with the same id was found to be in more than one context. This suggests a data integrity issue upstream. Deleting source thought and keeping destination thought for now.',
      )
      console.info('  sourceThought', sourceThought)
      console.info('  sourceThoughtPath', sourceThoughtPath)
      console.info('  targetThoughtPath', targetThoughtPath)
      const sourceParentId = head(parentOf(sourceThoughtPath))
      const sourceParent = getThoughtById(state, sourceParentId)
      const lexeme = getLexeme(state, sourceThought.value)
      const key = hashThought(sourceThought.value)
      return reducerFlow([
        // remove child from the source parent without deleting the Thought itself
        updateThoughts({
          thoughtIndexUpdates: {
            [sourceParentId]: {
              ...sourceParent,
              childrenMap: keyValueBy(sourceParent.childrenMap, (key, id) =>
                id !== sourceThought.id ? { [key]: id } : null,
              ),
            },
          },
          // update Lexeme
          lexemeIndexUpdates: lexeme
            ? {
                [key]: removeContext(state, lexeme, sourceThought.id),
              }
            : {},
        }),
      ])(state)
    }
  }

  if (normalizeThought(sourceThought.value) !== normalizeThought(targetThought.value)) {
    throw new Error('Cannot merge two thoughts with different values.')
  }

  const nextRank = getNextRank(state, targetThought.id)

  // moving the children of the source thought to the end of the target context.
  const newStateAfterMove = reducerFlow([
    ...Object.values(sourceThought.childrenMap).map(
      (childId, index) => (updatedState: State) =>
        moveThought(updatedState, {
          oldPath: appendToPath(sourceThoughtPath, childId),
          newPath: appendToPath(targetThoughtPath, childId),
          newRank: nextRank + index,
        }),
    ),
    (state: State) =>
      // if the cursor is on the duplicate that gets deleted (sourceThoughtPath), we need to update it to the preserved thought (targetThoughtPath)
      equalPath(state.cursor, sourceThoughtPath)
        ? {
            ...state,
            cursor: targetThoughtPath,
            editingValue: targetThought.value,
          }
        : state,
  ])(state)

  const lexemeKey = hashThought(sourceThought.value)

  const lexeme = newStateAfterMove.thoughts.lexemeIndex[lexemeKey]

  // remove source thought from the lexeme entry as its thought index entry will be deleted
  const lexemeIndexUpdates: Index<Lexeme | null> = {
    [lexemeKey]: {
      ...lexeme,
      contexts: lexeme.contexts.filter(thoughtId => thoughtId !== sourceThought.id),
    },
  }

  const sourceParentThoughtUpdated = getThoughtById(newStateAfterMove, sourceParentThought.id)

  if (sourceParentThoughtUpdated.id !== HOME_TOKEN && !getThoughtById(state, sourceParentThoughtUpdated.parentId)) {
    console.warn(
      `mergeThoughts: sourceParentThoughtUpdated's parentId of ${sourceParentThoughtUpdated.parentId} is no longer valid. This could be due to a bad sync. Skipping merge.`,
      sourceParentThoughtUpdated,
    )
    console.warn('sourceParentThoughtUpdated', sourceParentThoughtUpdated)
    return state
  }

  const thoughtIndexUpdates: Index<Thought | null> = {
    // delete source thought from the source parent's children
    [sourceParentThought.id]: {
      ...sourceParentThoughtUpdated,
      childrenMap: keyValueBy(sourceParentThoughtUpdated.childrenMap || {}, (key, id) =>
        id !== sourceThought.id ? { [key]: id } : null,
      ),
      lastUpdated: timestamp(),
      updatedBy: clientId,
    },
    // delete source thought
    [sourceThought.id]: null,
  }

  return updateThoughts(newStateAfterMove, {
    thoughtIndexUpdates,
    lexemeIndexUpdates,
    preventExpandThoughts: true,
  })
}

/** Action-creator for mergeThoughts. */
export const mergeThoughtsActionCreator =
  (payload: Parameters<typeof mergeThoughts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'mergeThoughts', ...payload })

export default _.curry(mergeThoughts)
