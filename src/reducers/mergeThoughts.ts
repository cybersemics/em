import _ from 'lodash'
import { moveThought, updateThoughts } from '.'
import { Lexeme, Path, State } from '../@types'
import { getThoughtById } from '../selectors'
import { getNextRankById } from '../selectors/getNextRank'
import { appendToPath, equalPath, hashThought, head, normalizeThought, reducerFlow, timestamp } from '../util'
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

  const nextRank = getNextRankById(state, targetThought.id)

  // moving the children of the source thought to the end of the target context.
  const newStateAfterMove = reducerFlow([
    ...sourceThought.children.map(
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

  const thoughtIndexUpdates = {
    // delete source thought from the source parent's children array,
    [sourceParentThought.id]: {
      ...sourceParentThought,
      children: sourceParentThought.children.filter(thoughtId => thoughtId !== sourceThought.id),
      updatedAt: timestamp(),
      updatedBy: getSessionId(),
    },
    // delete source thought
    [sourceThought.id]: null,
  }

  return updateThoughts(newStateAfterMove, {
    thoughtIndexUpdates,
    lexemeIndexUpdates,
  })
}

export default _.curry(mergeThoughts)
