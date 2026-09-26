import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import mergeThoughts from '../actions/mergeThoughts'
import updateThoughts from '../actions/updateThoughts'
import { clientId } from '../data-providers/thoughtspaceSession'
import expandThoughts from '../selectors/expandThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import getPreviousSiblingId from '../selectors/getPreviousSiblingId'
import getSortPreference from '../selectors/getSortPreference'
import getSortedPlacement from '../selectors/getSortedPlacement'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import normalizeThought from '../util/normalizeThought'
import pathToContext from '../util/pathToContext'
import reducerFlow from '../util/reducerFlow'
import timestamp from '../util/timestamp'
import alert from './alert'
import deleteAttribute from './deleteAttribute'

export interface MoveThoughtPayload {
  oldPath: Path
  newPath: Path
  offset?: number
  /** When true, skips merging with a duplicate thought in the destination context. Use when the caller manages duplicate handling itself (e.g. swapParent). */
  skipMerge?: boolean
  /** The destination predecessor, or null for first child. Sorted destinations choose their sorted placement. */
  afterId: ThoughtId | null
}

// @MIGRATION_TODO: use (sourceId and destinationId) or simplePath instead of passing paths. Should low level handle context view logic ??
/** Moves a thought from one context to another, or within the same context. */
const moveThought = (state: State, payload: MoveThoughtPayload, transaction?: ThoughtspaceTransaction) => {
  const { oldPath, newPath, offset, skipMerge, afterId } = payload
  const recentlyEdited = state.recentlyEdited

  const oldPathSimple = simplifyPath(state, oldPath)
  const newPathSimple = simplifyPath(state, newPath)
  const sourceThoughtPath = oldPathSimple
  const destinationThoughtPath = rootedParentOf(state, newPathSimple)
  const sourceThoughtId = head(sourceThoughtPath)
  const destinationThoughtId = head(destinationThoughtPath)

  const sourceThought = getThoughtById(state, sourceThoughtId)

  if (!sourceThought) {
    console.error({ oldPath, newPath, offset, afterId })
    throw new Error(`moveThought: sourceThought not found. ${JSON.stringify({ oldPath, newPath })}`)
  }

  // use parentid from oldPath until parentId data integrity issue is fixed
  const sourceParentId = head(rootedParentOf(state, sourceThoughtPath))
  if (sourceThought.parentId !== sourceParentId) {
    console.warn(`Invalid parentId: sourceThought.parentId does not match parentOf(oldPath).`)
    console.info('oldPath', oldPath)
    console.info('newPath', newPath)
    console.info('sourceThought', sourceThought)
  }

  const sourceParentThought = getThoughtById(state, sourceParentId)
  const destinationThought = getThoughtById(state, destinationThoughtId)

  if (!sourceParentThought || !destinationThought) {
    console.warn(
      `Missing sourceParentThought${sourceParentId} or destinationThought${destinationThoughtId}. Aborting moveThought.`,
    )
    return state
  }

  const sameContext = sourceParentThought.id === destinationThoughtId
  const childrenOfDestination = getChildrenRanked(state, destinationThoughtId)
  if (
    afterId === sourceThought.id ||
    (afterId !== null && !childrenOfDestination.some(child => child.id === afterId))
  ) {
    throw new Error(`moveThought: afterId must be null or a child of the destination context.`)
  }

  /**
   * Find first normalized duplicate thought.
   */
  const duplicateSubthought = () =>
    childrenOfDestination.find(child => normalizeThought(child.value) === normalizeThought(sourceThought.value))

  const destinationContext = pathToContext(state, destinationThoughtPath)

  // Auto-merge duplicate siblings is limited to metaprogramming-attribute contexts.
  // Attribute subtrees (e.g. =children, =style) must be hierarchically merged on move/paste so a
  // context never ends up with two of the same attribute. Normal thoughts are NOT merged, so
  // duplicate siblings coexist rather than silently disappearing (see
  // https://github.com/cybersemics/em/issues/3621).
  // isAttribute(sourceThought.value) merges the attribute node itself; destinationContext.some(isAttribute)
  // detects that the destination is inside a meta subtree, which drives the hierarchical recursion as
  // mergeThoughts moves each descendant back through moveThought.
  const isMetaMerge = isAttribute(sourceThought.value) || !!destinationContext?.some(isAttribute)

  // skipMerge bypasses the auto-merge when the caller intentionally moves a thought to a context
  // that already contains a thought with the same value (e.g. swapParent).
  // Do not treat empty thoughts as duplicates: an empty thought is a placeholder with no identity, so merging
  // it into an existing empty sibling would silently drop it (e.g. pasting a series with multiple empty thoughts).
  // See https://github.com/cybersemics/em/issues/4448.
  const duplicateThought =
    !sameContext && !skipMerge && sourceThought.value !== '' && isMetaMerge ? duplicateSubthought() : null

  const isArchived = destinationContext?.indexOf('=archive') !== -1

  // if move is used for archive then update the archived field to latest timestamp
  const archived = isArchived ? timestamp() : destinationThought.archived

  return reducerFlow([
    // disable sort when moving within the same context
    sameContext &&
    afterId !== getPreviousSiblingId(state, sourceThought.id) &&
    getSortPreference(state, destinationThoughtId).type !== 'None'
      ? reducerFlow([
          alert({
            value: 'Switched to manual sort because thought was moved',
          }),
          deleteAttribute({
            path: destinationThoughtPath,
            value: '=sort',
          }),
        ])
      : null,

    state => {
      // Note: In case of duplicate merge, the mergeThoughts handles both the merge, move logic and also calls updateThoughts. So we don't need to handle move logic if duplicate thoughts are merged.
      if (duplicateThought) {
        return mergeThoughts(
          state,
          {
            sourceThoughtPath,
            targetThoughtPath: appendToPath(destinationThoughtPath, duplicateThought.id),
          },
          transaction,
        )
      }

      const sorted = !sameContext && getSortPreference(state, destinationThoughtId).type !== 'None'
      // Disabling sort can delete the requested predecessor (=sort). Keep the same gap after its last surviving sibling.
      const survivingAfterId =
        afterId === null
          ? null
          : (childrenOfDestination
              .slice(0, childrenOfDestination.findIndex(child => child.id === afterId) + 1)
              .filter(child => child.id !== sourceThought.id && getThoughtById(state, child.id))
              .at(-1)?.id ?? null)
      const thoughtIndexUpdates: Index<Thought> = {
        ...(!sameContext
          ? {
              [sourceParentThought.id]: {
                ...sourceParentThought,
                lastUpdated: timestamp(),
                updatedBy: clientId,
              },
              [destinationThought.id]: {
                ...destinationThought,
                lastUpdated: timestamp(),
                updatedBy: clientId,
              },
            }
          : {}),
        // Rank remains read metadata; the explicit placement changes canonical sibling order.
        [sourceThought.id]: {
          ...sourceThought,
          parentId: destinationThought.id,
          ...(archived ? { archived } : null),
          lastUpdated: timestamp(),
          updatedBy: clientId,
        },
      }

      return updateThoughts(
        state,
        {
          thoughtIndexUpdates,
          recentlyEdited,
          preventExpandThoughts: true,
          movePlacements: {
            [sourceThought.id]: sorted
              ? getSortedPlacement(state, destinationThoughtId, sourceThought.value, {
                  created: sourceThought.created,
                  staleId: sourceThought.id,
                })
              : survivingAfterId,
          },
        },
        transaction,
      )
    },
    // update cursor if moved path is on the cursor
    state => {
      if (!state.cursor) return state

      const isPathInCursor = isDescendantPath(state.cursor, oldPath)
      const isCursorAtOldPath = state.cursor.length === oldPath.length

      // In the context view the cursor is on the nominal context (the m of a/m~), while the dragged context row is
      // the deeper Path a/m~/a that resolves to the same thought. oldPath is then not an ancestor of the cursor even
      // though the moved thought is, so the cursor has to be rebased onto the thought's new location. Otherwise it
      // keeps naming a parent that no longer contains the thought, so expansion cannot follow the cursor.
      // Skipped when the thought no longer exists, i.e. it was merged into a duplicate in the destination.
      const isMovedThoughtInCursor =
        !isPathInCursor && isDescendantPath(state.cursor, oldPathSimple) && !!getThoughtById(state, sourceThought.id)

      const newCursorPath = isPathInCursor
        ? isCursorAtOldPath
          ? newPath
          : ([...newPath, ...state.cursor.slice(newPath.length)] as Path)
        : isMovedThoughtInCursor
          ? ([...destinationThoughtPath, sourceThought.id, ...state.cursor.slice(oldPathSimple.length)] as Path)
          : state.cursor

      return {
        ...state,
        cursor: newCursorPath,
        ...(offset != null ? { cursorOffset: offset } : null),
      }
    },
    // expand thoughts after cursor has been updated
    state => ({
      ...state,
      expanded: expandThoughts(state, state.cursor),
    }),
  ])(state, transaction)
}

/** Action-creator for moveThought. */
export const moveThoughtActionCreator =
  (payload: Parameters<typeof moveThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'moveThought', ...payload })

export default command(moveThought)

// Register this action's metadata
registerActionMetadata('moveThought', {
  undoable: true,
})
