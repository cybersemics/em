import _ from 'lodash'
import type Index from '../@types/IndexType'
import Path from '../@types/Path'
import PushBatch from '../@types/PushBatch'
import RecentlyEditedTree from '../@types/RecentlyEditedTree'
import State from '../@types/State'
import Thought from '../@types/Thought'
import type ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { GLOBAL_ROOT_TOKEN, HOME_TOKEN } from '../constants'
import expandThoughts from '../selectors/expandThoughts'
import getSetting from '../selectors/getSetting'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import { childrenMapKey } from '../util/createChildrenMap'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'
import mergeUpdates from '../util/mergeUpdates'
import projectLexemes from '../util/projectLexemes'
import reducerFlow from '../util/reducerFlow'
import acknowledgeThoughtWrites from './acknowledgeThoughtWrites'

export type UpdateThoughtsOptions = Omit<PushBatch, 'lexemeIndexUpdates'> & {
  lexemeIndexUpdates?: PushBatch['lexemeIndexUpdates']
  cursorOffset?: number
  // callback for when the updates have been synced with IDB
  idbSynced?: () => void
  isLoading?: boolean
  recentlyEdited?: RecentlyEditedTree
  /** By default, thoughts will be re-expanded with the fresh state. If a separate expandThoughts is called after updateThoughts within the same reducerFlow, then we can prevent expandThoughts here for better performance. See moveThought. */
  preventExpandThoughts?: boolean
  /** Allow non-pending thoughts to become pending. This is mainly used by freeThoughts. */
  overwritePending?: boolean
  /**
   * If true, check if the cursor is valid, and if not, move it to the closest valid ancestor.
   * This should only be used when the updates are coming from another device. For local updates, updateThoughts is typically called within a higher level reducer (e.g. moveThought) which handles all cursor updates. There would be false positives during local updates since the cursor is updated after updateThoughts.
   */
  repairCursor?: boolean
  /** A committed refresh published within the provider's storage sequence. */
  materialized?: boolean
  /** Clears only matching pending edits in the same update that publishes their committed state. */
  confirmedWriteIds?: string[]
}

/** Applies outstanding field edits to confirmed state, rebuilding only their affected parent lists. */
const applyPendingThoughtWrites = (
  state: State,
  confirmed: Index<Thought>,
  updates: Index<Thought | null>,
): Index<Thought> => {
  const pending = Object.entries(state.pendingThoughtWrites)
  if (pending.length === 0) return confirmed
  const thoughts = { ...confirmed }
  // A pull can refresh an old parent without refreshing its optimistically moved child.
  const parents = new Set(
    Object.values(updates).flatMap(thought =>
      thought && Object.values(thought.childrenMap).some(id => id in state.pendingThoughtWrites) ? [thought.id] : [],
    ),
  )
  const placements = new Set<string>()

  pending.forEach(([id, { patch }]) => {
    const previous = confirmed[id] ?? state.thoughts.thoughtIndex[id]
    if (previous) parents.add(previous.parentId)
    if (patch === null) {
      delete thoughts[id]
      return
    }
    // Neither derived membership nor UI-only flags belong to a pending persistence patch.
    const {
      childrenMap: _childrenMap,
      pending: _pending,
      generating: _generating,
      splitSource: _splitSource,
      ...fields
    } = patch
    if (previous) thoughts[id] = { ...previous, ...fields }
    if (patch.parentId !== undefined) placements.add(id)
    if (thoughts[id]) parents.add(thoughts[id].parentId)
  })

  placements.forEach(id => {
    const thought = thoughts[id]
    if (!thought) return
    // A remote move can make a still-pending destination our descendant. Never project a cycle.
    const visited = new Set<string>([id])
    let parent = thoughts[thought.parentId]
    while (parent && parent.id !== GLOBAL_ROOT_TOKEN && !visited.has(parent.id)) {
      visited.add(parent.id)
      parent = thoughts[parent.parentId]
    }
    if (parent && visited.has(parent.id)) {
      const previous = confirmed[id]
      if (previous) thoughts[id] = { ...thought, parentId: previous.parentId, rank: previous.rank }
      else delete thoughts[id]
      placements.delete(id)
    }
  })

  parents.forEach(parentId => {
    const parent = thoughts[parentId]
    if (!parent) return
    const children = Object.values(parent.childrenMap).filter(id =>
      placements.has(id) ? false : state.pendingThoughtWrites[id]?.patch !== null,
    )
    pending.forEach(([id, { afterId }]) => {
      const thought = thoughts[id]
      if (!placements.has(id) || thought?.parentId !== parentId) return
      const afterIndex = afterId == null ? -1 : children.indexOf(afterId)
      const index =
        afterId === null || afterIndex >= 0
          ? afterIndex + 1
          : children.findIndex(childId => thoughts[childId] && thoughts[childId].rank > thought.rank)
      children.splice(index < 0 ? children.length : index, 0, thought.id)
    })
    const oldKeys = Object.fromEntries(Object.entries(parent.childrenMap).map(([key, id]) => [id, key]))
    const childrenMap: Index<ThoughtId> = {}
    children.forEach((id, rank) => {
      const child = thoughts[id]
      childrenMap[child ? childrenMapKey(childrenMap, child) : (oldKeys[id] ?? id)] = id
      if (child) thoughts[id] = { ...child, rank }
    })
    thoughts[parentId] = { ...thoughts[parentId], childrenMap }
  })
  return thoughts
}

/** A reducer that repairs the cursor if it moved or was deleted. */
// TODO: Not fully tested when cursor is in a context view.
const repairCursorReducer = (state: State): State => {
  if (!state.cursor) return state

  const simplePath = simplifyPath(state, state.cursor)
  let cursorNew: Path | null | undefined

  // cursor was moved but still exists
  // update the cursor to the new path
  const cursorThought = pathToThought(state, state.cursor)
  if (cursorThought) {
    const recalculatedCursor = thoughtToPath(state, head(simplePath))
    if (!_.isEqual(recalculatedCursor, simplePath)) {
      cursorNew = recalculatedCursor
    }
  }
  // cursor was removed
  // find the closest existent ancestor
  else {
    const closestAncestorIndex = state.cursor.findIndex((id, i) => {
      const ancestorPath = state.cursor!.slice(0, i + 1) as Path
      const thought = pathToThought(state, ancestorPath)
      return !thought || thought.parentId !== head(rootedParentOf(state, ancestorPath))
    })
    cursorNew = closestAncestorIndex > 0 ? (state.cursor.slice(0, closestAncestorIndex) as Path) : null
  }

  return cursorNew !== undefined
    ? {
        ...state,
        cursor: cursorNew,
      }
    : state
}

/**
 * Updates lexemeIndex and thoughtIndex with any number of thoughts.
 *
 * @param local    If false, does not persist to local database. Default: true.
 * @param remote   If false, does not persist to remote database. Default: true.
 */
const updateThoughts = (
  state: State,
  {
    cursorOffset,
    lexemeIndexUpdates = {},
    thoughtIndexUpdates,
    recentlyEdited,
    pendingDeletes,
    preventExpandThoughts,
    movePlacements,
    local = true,
    remote = true,
    idbSynced,
    isLoading,
    overwritePending,
    repairCursor,
    materialized,
    confirmedWriteIds,
  }: UpdateThoughtsOptions,
) => {
  if (confirmedWriteIds) state = acknowledgeThoughtWrites(state, { writeIds: confirmedWriteIds })
  if (Object.keys(thoughtIndexUpdates).length === 0 && Object.keys(lexemeIndexUpdates).length === 0) return state

  const thoughtIndexOld = { ...state.thoughts.thoughtIndex }
  const lexemeIndexOld = { ...state.thoughts.lexemeIndex }

  // Ordinary pulls can read intermediate local writes with the same timestamp (#3948).
  // Keep the <= guard for those unversioned reads. Materialization owns the storage queue
  // instead: an order-only change need not advance the payload timestamp. Missing/pending thoughts,
  // deletions, and intentional cache overwrites still pass through.
  const thoughtIndexUpdatesFresh =
    local || overwritePending || materialized
      ? thoughtIndexUpdates
      : keyValueBy(thoughtIndexUpdates, (id, thoughtUpdate) => {
          const thoughtOld = thoughtIndexOld[id]
          return thoughtUpdate &&
            thoughtOld &&
            !thoughtOld.pending &&
            thoughtUpdate.lastUpdated <= thoughtOld.lastUpdated
            ? null
            : { [id]: thoughtUpdate }
        })

  // TODO: Can we use { overwritePending: !local } and get rid of the overwritePending option to updateThoughts? i.e. Are there any false positives when local is false?
  const mergedThoughts = mergeUpdates(thoughtIndexOld, thoughtIndexUpdatesFresh, { overwritePending })
  const thoughtIndex =
    !local && !remote && !overwritePending
      ? applyPendingThoughtWrites(state, mergedThoughts, thoughtIndexUpdatesFresh)
      : mergedThoughts
  const lexemeIndex = projectLexemes(
    mergeUpdates(lexemeIndexOld, lexemeIndexUpdates, { overwritePending }),
    local || remote
      ? thoughtIndexUpdatesFresh
      : Object.fromEntries(Object.keys(state.pendingThoughtWrites).map(id => [id, thoughtIndex[id] ?? null])),
  )

  const recentlyEditedNew = recentlyEdited || state.recentlyEdited

  // updates are queued, detected by the pushQueue middleware, and sync'd with the local and remote stores
  const batch: PushBatch = {
    idbSynced,
    lexemeIndexUpdates,
    local,
    movePlacements,
    pendingDeletes,
    remote,
    thoughtIndexUpdates: thoughtIndexUpdatesFresh,
  }

  /** Returns true if the thoughtspace is still loading because root thought is missing or pending and the tutorial is not running. */
  const isStillLoading = () => {
    // isLoading arg takes precedence
    if (isLoading != null) return isLoading

    // disable isLoading if tutorial is on
    if (getSetting(state, 'Tutorial') === 'On') return false

    const rootThought: Thought | null = thoughtIndexUpdatesFresh[HOME_TOKEN] || thoughtIndex[HOME_TOKEN]
    const isRootLoaded =
      rootThought &&
      !rootThought.pending &&
      // Disable isLoading if the root children have been loaded.
      // Otherwise EmptyThoughtspace will still be shown since there are no children to render.
      // If the root has no children and is no longer pending, we can disable isLoading immediately.
      (Object.keys(rootThought.childrenMap).length === 0 ||
        Object.values(rootThought.childrenMap).find(childId => thoughtIndex[childId]))
    return !isRootLoaded
  }

  return reducerFlow([
    // update recentlyEdited, pushQueue, and thoughts
    state => ({
      ...state,
      ...(cursorOffset != null ? { cursorOffset } : null),
      // disable loading screen as soon as the root is loaded
      // or isLoading can be forced by passing it directly to updateThoughts
      isLoading: state.isLoading && isStillLoading(),
      recentlyEdited: recentlyEditedNew,
      pushQueue: [...state.pushQueue, batch],
      thoughts: {
        thoughtIndex,
        lexemeIndex,
      },
    }),

    // Repair cursor
    // When getting updates from another device, the cursor may have moved or no longer exist, and needs to be updated.
    repairCursor ? repairCursorReducer : null,

    // expandThoughts
    state => {
      return {
        ...state,
        // calculate expanded using fresh thoughts and cursor
        ...(!preventExpandThoughts ? { expanded: expandThoughts(state, state.cursor) } : null),
      }
    },
  ])(state)
}

/** Action-creator for updateThoughts. */
export const updateThoughtsActionCreator =
  (payload: Parameters<typeof updateThoughts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'updateThoughts', ...payload })

export default _.curryRight(updateThoughts)

// Register this action's metadata
registerActionMetadata('updateThoughts', {
  undoable: false,
})
