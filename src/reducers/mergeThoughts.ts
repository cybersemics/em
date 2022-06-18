import _ from 'lodash'
import moveThought from './moveThought'
import updateThoughts from './updateThoughts'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import getNextRank from '../selectors/getNextRank'
import getThoughtById from '../selectors/getThoughtById'
import { HOME_TOKEN } from '../constants'
import appendToPath from '../util/appendToPath'
import equalPath from '../util/equalPath'
import hashThought from '../util/hashThought'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'
import normalizeThought from '../util/normalizeThought'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import timestamp from '../util/timestamp'
import { getSessionId } from '../util/sessionManager'

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
    console.warn('  sourceThought', sourceThought)
    console.warn('  sourceThoughtPath', sourceThought.id)
    return state
  }

  if (sourceThought.id === targetThought.id) {
    throw new Error('Cannot merge a thought to itself.')
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
      updatedBy: getSessionId(),
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

export default _.curry(mergeThoughts)
