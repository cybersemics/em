import _ from 'lodash'
import { moveThought, updateThoughts } from '.'
import { Index, Lexeme, Path, State, Thought } from '../@types'
import { getNextRank, getThoughtById } from '../selectors'
import {
  appendToPath,
  equalPath,
  hashThought,
  head,
  keyValueBy,
  normalizeThought,
  reducerFlow,
  timestamp,
} from '../util'
import { getSessionId } from '../util/sessionManager'

/**
 * Merges two given thoughts with same value by moving all the children of the source thought to the end of the desination context.
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
  const sourceParentThought = getThoughtById(state, sourceThought.parentId)

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

  const hashedThought = hashThought(sourceThought.value)

  const sourceThoughtlexeme = newStateAfterMove.thoughts.lexemeIndex[hashedThought]!

  // remove source thought from the lexeme entry as its thought index entry will be deleted
  const updatedLexeme: Lexeme = {
    ...sourceThoughtlexeme,
    contexts: sourceThoughtlexeme!.contexts.filter(thoughtId => thoughtId !== sourceThought.id),
  }

  const lexemeIndexUpdates = {
    [hashedThought]: updatedLexeme,
  }

  const sourceParentThoughtUpdated = getThoughtById(newStateAfterMove, sourceParentThought.id)
  const childrenMap = keyValueBy(sourceParentThoughtUpdated.childrenMap || {}, (key, id) =>
    id !== sourceThought.id ? { [key]: id } : null,
  )

  const thoughtIndexUpdates: Index<Thought | null> = {
    // delete source thought from the source parent's children array,
    [sourceParentThought.id]: {
      ...sourceParentThoughtUpdated,
      childrenMap,
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
