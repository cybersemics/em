import _ from 'lodash'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import mergeThoughts from '../actions/mergeThoughts'
import rerank from '../actions/rerank'
import updateThoughts from '../actions/updateThoughts'
import { clientId } from '../data-providers/thoughtspaceSession'
import expandThoughts from '../selectors/expandThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import getMovePlacement from '../selectors/getMovePlacement'
import getSortPreference from '../selectors/getSortPreference'
import getSortedRank from '../selectors/getSortedRank'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import keyValueBy from '../util/keyValueBy'
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
  // skip the auto rerank to prevent infinite loop
  skipRerank?: boolean
  /** When true, skips merging with a duplicate thought in the destination context. Use when the caller manages duplicate handling itself (e.g. swapParent). */
  skipMerge?: boolean
  /** The new rank of the destination thought. This will be ignored if the thought is moved into a sorted context. */
  newRank: number
  /**
   * ID of sibling after which to place in TreeCRDT.
   * Explicit null means first child.
   * Undefined means derive placement from newRank for legacy em rank-based callers.
   * If the destination remains sorted, its sort order determines placement instead.
   */
  afterId?: ThoughtId | null
}

/** Re-ranks a thought whose lastUpdated was just bumped so that its rank still matches its context's sort condition. Only a context sorted by Updated is affected, since lastUpdated is its sort key; the bumped thought becomes the most recently updated of its siblings, which is last in rank order when ascending and first when descending. Other sort conditions compare values or immutable timestamps, so a bump cannot invalidate their ranks. */
const rerankUpdated = (state: State, id: ThoughtId): State => {
  const thought = getThoughtById(state, id)
  if (!thought) return state

  const sortPreference = getSortPreference(state, thought.parentId)
  if (sortPreference.type !== 'Updated') return state

  const siblings = getChildrenRanked(state, thought.parentId).filter(child => child.id !== id)
  if (siblings.length === 0) return state

  const rank = sortPreference.direction === 'Desc' ? siblings[0].rank - 1 : siblings[siblings.length - 1].rank + 1
  if (rank === thought.rank) return state

  return updateThoughts(state, {
    thoughtIndexUpdates: {
      [id]: {
        ...thought,
        rank,
      },
    },
    lexemeIndexUpdates: {},
    movePlacements: { [id]: getMovePlacement(state, thought.parentId, { id, rank }) },
    preventExpandThoughts: true,
  })
}

// @MIGRATION_TODO: use (sourceId and destinationId) or simplePath instead of passing paths. Should low level handle context view logic ??
/** Moves a thought from one context to another, or within the same context. */
const moveThought = (state: State, payload: MoveThoughtPayload) => {
  const { oldPath, newPath, offset, skipRerank, skipMerge, newRank, afterId } = payload
  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  const recentlyEdited = state.recentlyEdited
  // try {
  //   recentlyEdited = treeMove(state, state.recentlyEdited, oldPath, newPath)
  // } catch (e) {
  //   console.error('moveThought: treeMove immer error')
  //   console.error(e)
  // }

  const oldPathSimple = simplifyPath(state, oldPath)
  const newPathSimple = simplifyPath(state, newPath)
  const sourceThoughtPath = oldPathSimple
  const destinationThoughtPath = rootedParentOf(state, newPathSimple)
  const sourceThoughtId = head(sourceThoughtPath)
  const destinationThoughtId = head(destinationThoughtPath)

  const sourceThought = getThoughtById(state, sourceThoughtId)

  if (!sourceThought) {
    console.error({ oldPath, newPath, offset, skipRerank, newRank })
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
  const effectiveAfterId =
    afterId !== undefined
      ? afterId
      : getMovePlacement(state, destinationThoughtId, {
          id: sourceThought.id,
          rank: newRank,
          rankedChildren: childrenOfDestination,
        })

  if (
    effectiveAfterId === sourceThought.id ||
    (effectiveAfterId !== null && !childrenOfDestination.some(child => child.id === effectiveAfterId))
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

  const isPendingMerge = duplicateThought && (sourceThought.pending || duplicateThought.pending)

  const isArchived = destinationContext?.indexOf('=archive') !== -1

  // if move is used for archive then update the archived field to latest timestamp
  const archived = isArchived ? timestamp() : destinationThought.archived

  return reducerFlow([
    // disable sort when moving within the same context
    // skip if skipRerank is set (e.g. rerank) to avoid disabling sort during internal rank normalization
    sameContext &&
    !skipRerank &&
    newRank !== sourceThought.rank &&
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
      if (duplicateThought && !isPendingMerge) {
        return mergeThoughts(state, {
          sourceThoughtPath,
          targetThoughtPath: appendToPath(destinationThoughtPath, duplicateThought.id),
        })
      }

      // remove sourceThought from sourceParentThought
      const sourceParentThoughtChildrenMapNew = keyValueBy(sourceParentThought.childrenMap, (key, id) =>
        id !== sourceThought.id ? { [key]: id } : null,
      )

      // add source thought to the destination thought children array
      const destinationThoughtChildrenMapNew = {
        ...destinationThought.childrenMap,
        [isAttribute(sourceThought.value) ? sourceThought.value : sourceThought.id]: sourceThought.id,
      }

      // Moving within this context may have disabled sorting above.
      const isSorted = getSortPreference(state, destinationThoughtId).type !== 'None'

      // A moved thought keeps its created timestamp, so a Created context sorts it by that rather than by its value.
      // Without it getSortedRank falls through to the alphabetical branch and ranks the thought against siblings it
      // does not sort by, inverting the rank order against the sort condition (#4096).
      const rank = isSorted
        ? getSortedRank(state, destinationThoughtId, sourceThought.value, { created: sourceThought.created })
        : newRank

      const thoughtIndexUpdates: Index<Thought> = {
        ...(!sameContext
          ? {
              [sourceParentThought.id]: {
                ...sourceParentThought,
                childrenMap: sourceParentThoughtChildrenMapNew,
                lastUpdated: timestamp(),
                updatedBy: clientId,
              },
              [destinationThought.id]: {
                ...destinationThought,
                childrenMap: destinationThoughtChildrenMapNew,
                lastUpdated: timestamp(),
                updatedBy: clientId,
              },
            }
          : {}),
        // update source thought parent id, rank and other stuffs
        [sourceThought.id]: {
          ...sourceThought,
          parentId: destinationThought.id,
          rank,
          ...(archived ? { archived } : null),
          lastUpdated: timestamp(),
          updatedBy: clientId,
        },
      }

      return updateThoughts(state, {
        thoughtIndexUpdates,
        lexemeIndexUpdates: {},
        recentlyEdited,
        preventExpandThoughts: true,
        // A sorted context ranks the thought by the sort condition rather than where the caller asked for it, so the
        // caller's placement would store an order that disagrees with the rendered one and bring the context back
        // unsorted after a refresh. Derive the placement from the rank that is actually written.
        movePlacements: {
          [sourceThought.id]: isSorted
            ? getMovePlacement(state, destinationThoughtId, {
                id: sourceThought.id,
                rank,
                rankedChildren: childrenOfDestination,
              })
            : effectiveAfterId,
        },
      })
    },
    // A cross-context move bumps lastUpdated on both parents. In a context sorted by Updated that is the sort key, so
    // each parent's own rank no longer matches the sort condition and has to be restored (#4097).
    !sameContext ? (state: State) => rerankUpdated(state, sourceParentThought.id) : null,
    !sameContext ? (state: State) => rerankUpdated(state, destinationThought.id) : null,

    // Rebase every stored Path that runs through the moved thought onto the thought's new location: the cursor, the
    // multiselect, and the Select Between range and anchor. This is the only point that knows both where the thought
    // was and where it is now. A Path left behind names a parent that no longer contains the thought, so nothing below
    // it renders, and a multiselect that is dropped somewhere else would otherwise land the cursor on such a Path when
    // the selection ends (see multiselectCursorMiddleware).
    state => {
      // Skipped when the thought no longer exists, i.e. it was merged into a duplicate in the destination.
      const isMovedThoughtLive = !!getThoughtById(state, sourceThought.id)

      /** Returns the given Path rebased onto the moved thought's new location, or the Path itself if it does not run through the moved thought. */
      const rebase = (path: Path): Path =>
        isDescendantPath(path, oldPath)
          ? ([...newPath, ...path.slice(oldPath.length)] as Path)
          : // In the context view the cursor is on the nominal context (the m of a/m~), while the dragged context row is
            // the deeper Path a/m~/a that resolves to the same thought. oldPath is then not an ancestor of the Path even
            // though the moved thought is, so the Path has to be rebased onto the thought's new location. Otherwise it
            // keeps naming a parent that no longer contains the thought: expandThoughts can no longer reach the cursor,
            // freeThoughts deallocates it as no longer visible, and the next expandThoughts throws "Invalid path".
            isMovedThoughtLive && isDescendantPath(path, oldPathSimple)
            ? ([...destinationThoughtPath, sourceThought.id, ...path.slice(oldPathSimple.length)] as Path)
            : path

      /** Rebases each Path in an index keyed by hashPath, re-keying the ones that moved. Returns the same index if none of them did. */
      const rebaseIndex = (paths: Index<Path>): Index<Path> =>
        Object.values(paths).some(path => rebase(path) !== path)
          ? keyValueBy(Object.values(paths), path => {
              const rebased = rebase(path)
              return { [hashPath(rebased)]: rebased }
            })
          : paths

      return {
        ...state,
        cursor: state.cursor && rebase(state.cursor),
        multicursors: rebaseIndex(state.multicursors),
        multicursorRange: rebaseIndex(state.multicursorRange),
        multicursorAnchor: state.multicursorAnchor && rebase(state.multicursorAnchor),
        ...(state.cursor && offset != null ? { cursorOffset: offset } : null),
      }
    },
    // expand thoughts after cursor has been updated
    state => ({
      ...state,
      expanded: expandThoughts(state, state.cursor),
    }),
    // rerank context if ranks are too close
    // skip if this moveThought originated from a rerank
    // otherwise we get an infinite loop
    !skipRerank
      ? state => {
          const rankPrecision = 10e-8
          const children = getChildrenRanked(state, head(rootedParentOf(state, newPathSimple)))
          const ranksTooClose = children.some((thought, i) => {
            if (i === 0) return false
            const secondThought = getThoughtById(state, children[i - 1].id)
            if (!secondThought) return false
            return Math.abs(thought.rank - secondThought.rank) < rankPrecision
          })
          // Rerank operates on the physical parent path, so use the simplified destination path.
          return ranksTooClose ? rerank(state, rootedParentOf(state, newPathSimple) as SimplePath) : state
        }
      : null,
  ])(state)
}

/** Action-creator for moveThought. */
export const moveThoughtActionCreator =
  (payload: Parameters<typeof moveThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'moveThought', ...payload })

export default _.curryRight(moveThought, 2)

// Register this action's metadata
registerActionMetadata('moveThought', {
  undoable: true,
})
