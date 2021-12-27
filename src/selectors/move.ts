import { getThoughtById, getChildrenRankedById } from '.'
import { Index, Lexeme, Parent, Path, PendingMerge, State } from '../@types'
import { normalizeThought, appendToPath, pathToContext, timestamp, head } from '../util'
import { getSessionId } from '../util/sessionManager'
import mergeThoughts from './mergeThoughts'

interface RecursiveMoveData {
  thoughtIndexUpdates: Index<Lexeme | null>
  contextIndexUpdates: Index<Parent | null>
  pendingMerges: PendingMerge[]
}

/**
 * Moves a thought to a destination and handles duplicate merging if found any.
 */
const move = (
  state: State,
  {
    sourceThoughtPath,
    destinationThoughtPath,
    rank,
  }: { sourceThoughtPath: Path; destinationThoughtPath: Path; rank: number },
): RecursiveMoveData => {
  const sourceThoughtId = head(sourceThoughtPath)
  const destinationThoughtId = head(destinationThoughtPath)

  const sourceThought = getThoughtById(state, sourceThoughtId)
  const sourceParentThought = getThoughtById(state, sourceThought.parentId)
  const destinationThought = getThoughtById(state, destinationThoughtId)

  const sameContext = sourceParentThought.id === destinationThoughtId
  const childrenOfDestination = getChildrenRankedById(state, destinationThoughtId)

  /**
   * Find duplicate thought.
   */
  const duplicateSubthought = () =>
    childrenOfDestination.find(child => normalizeThought(child.value) === normalizeThought(sourceThought.value))

  // if thought is being moved to the same context that is not a duplicate case
  const duplicateThought = !sameContext ? duplicateSubthought() : undefined

  const isPendingMerge = duplicateThought && (sourceThought.pending || duplicateThought.pending)

  const mergeUpdates =
    !!duplicateThought &&
    !isPendingMerge &&
    mergeThoughts(state, {
      sourceThoughtPath,
      targetThoughtPath: appendToPath(destinationThoughtPath, duplicateThought.id),
    })

  const destinationContext = pathToContext(state, destinationThoughtPath)

  const isArchived = destinationContext?.indexOf('=archive') !== -1

  // if move is used for archive then update the archived field to latest timestamp
  const archived = isArchived ? timestamp() : destinationThought.archived

  const finalContextIndexUpdates = {
    // incase of merge mergeThoughts handles everything
    ...(mergeUpdates
      ? mergeUpdates.contextIndexUpdates
      : {
          // if moved within same context we don't need to remove and add source thought from source parent to the destination
          ...(!sameContext
            ? {
                // remove source thought from the previous source parent children array
                [sourceParentThought.id]: {
                  ...sourceParentThought,
                  children: sourceParentThought.children.filter(thoughtId => thoughtId !== sourceThought.id),
                  lastUpdated: timestamp(),
                  updatedBy: getSessionId(),
                },
                // add source thought to the destination thought children array
                [destinationThought.id]: {
                  ...destinationThought,
                  children: [...destinationThought.children, sourceThought.id],
                  lastUpdated: timestamp(),
                  updatedBy: getSessionId(),
                },
              }
            : {}),
          // update source thought parent id, rank and other stuffs
          [sourceThought.id]: {
            ...sourceThought,
            parentId: destinationThought.id,
            rank,
            archived,
            lastUpdated: timestamp(),
            updatedBy: getSessionId(),
          },
        }),
  }

  const finalUpdates: RecursiveMoveData = {
    contextIndexUpdates: finalContextIndexUpdates,
    thoughtIndexUpdates: mergeUpdates ? mergeUpdates.thoughtIndexUpdates : {},
    pendingMerges:
      isPendingMerge && duplicateThought
        ? [
            {
              sourcePath: appendToPath(destinationThoughtPath, sourceThought.id),
              targetPath: appendToPath(destinationThoughtPath, duplicateThought.id),
            },
          ]
        : [],
  }

  return finalUpdates
}

export default move
