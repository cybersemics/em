import { omit } from 'lodash'
import { getThoughtById } from '.'
import { Index, Lexeme, Parent, Path, PendingMerge, State } from '../@types'
import { appendToPath, hashThought, head, normalizeThought, timestamp } from '../util'
import { getSessionId } from '../util/sessionManager'
import { getNextRankById } from './getNextRank'
import move from './move'

interface RecursiveMoveData {
  thoughtIndexUpdates: Index<Lexeme | null>
  contextIndexUpdates: Index<Parent | null>
  pendingMerges: PendingMerge[]
}

/**
 * Deletes the null entries from the given thought indices update and return the updated state.
 */
const getUpdatedState = (
  state: State,
  contextIndexUpdates: Index<Parent | null>,
  thoughtIndexUpdates: Index<Lexeme | null>,
): State => {
  const deletedLexemeKeys = Object.keys(thoughtIndexUpdates).filter(key => !thoughtIndexUpdates[key])
  const deletedParentKeys = Object.keys(contextIndexUpdates).filter(key => !contextIndexUpdates[key])

  const updatedContextIndex = omit(
    {
      ...state.thoughts.contextIndex,
      ...contextIndexUpdates,
    },
    [...deletedParentKeys],
  ) as Index<Parent>

  const updatedThoughtIndex = omit(
    {
      ...state.thoughts.thoughtIndex,
      ...thoughtIndexUpdates,
    },
    [...deletedLexemeKeys],
  ) as Index<Lexeme>

  return {
    ...state,
    thoughts: {
      ...state.thoughts,
      contextIndex: {
        ...state.thoughts.contextIndex,
        ...updatedContextIndex,
      },
      thoughtIndex: {
        ...state.thoughts.thoughtIndex,
        ...updatedThoughtIndex,
      },
    },
  }
}

/**
 * Merges two given with same value.
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
) => {
  const sourceThought = getThoughtById(state, head(sourceThoughtPath))
  const targetThought = getThoughtById(state, head(targetThoughtPath))
  const sourceParentThought = getThoughtById(state, sourceThought.parentId)

  if (sourceThought.id === targetThought.id) {
    throw new Error('Cannot merge a thought to itself.')
  }

  if (normalizeThought(sourceThought.value) !== normalizeThought(targetThought.value)) {
    throw new Error('Cannot merge two thoughts with different values.')
  }

  const nextRank = getNextRankById(state, targetThought.id)

  // move all the children of the source thought to the duplicate thought
  const updates = sourceThought.children.reduce<RecursiveMoveData>(
    (acc, childId, index) => {
      const updatedState = getUpdatedState(state, acc.contextIndexUpdates, acc.thoughtIndexUpdates)
      const moveData = move(updatedState, {
        sourceThoughtPath: appendToPath(sourceThoughtPath, childId),
        destinationThoughtPath: targetThoughtPath,
        rank: nextRank + index,
      })

      return {
        thoughtIndexUpdates: {
          ...acc.thoughtIndexUpdates,
          ...moveData.thoughtIndexUpdates,
        },
        contextIndexUpdates: {
          ...acc.contextIndexUpdates,
          ...moveData.contextIndexUpdates,
        },
        pendingMerges: [...acc.pendingMerges, ...moveData.pendingMerges],
      }
    },
    {
      thoughtIndexUpdates: {},
      contextIndexUpdates: {},
      pendingMerges: [],
    },
  )

  const updatedThoughtIndex = {
    ...state.thoughts.thoughtIndex,
    ...updates.thoughtIndexUpdates,
  }

  const hashedThought = hashThought(sourceThought.value)

  const sourceThoughtlexeme = updatedThoughtIndex[hashedThought]!

  // remove source thought from the lexeme entry as it's context index entry will be deleted
  const updatedLexeme: Lexeme = {
    ...sourceThoughtlexeme,
    contexts: sourceThoughtlexeme!.contexts.filter(thoughtId => thoughtId !== sourceThought.id),
  }

  const finalUpdatedThoughtIndex = {
    ...updates.thoughtIndexUpdates,
    [hashedThought]: updatedLexeme,
  }

  const mergeUpdates = {
    ...updates,
    contextIndexUpdates: {
      // copy children of source thought to the target thought
      ...updates.contextIndexUpdates,
      // delete source thought from the source parent's children array,
      [sourceParentThought.id]: {
        ...sourceParentThought,
        children: sourceParentThought.children.filter(thoughtId => thoughtId !== sourceThought.id),
        updatedAt: timestamp(),
        updatedBy: getSessionId(),
      },
      // delete source thought
      [sourceThought.id]: null,
    },
    thoughtIndexUpdates: finalUpdatedThoughtIndex,
  }

  return mergeUpdates
}

export default mergeThoughts
