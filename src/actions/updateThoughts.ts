import _ from 'lodash'
import Path from '../@types/Path'
import PushBatch from '../@types/PushBatch'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import Thunk from '../@types/Thunk'
import { editThoughtPayload } from '../actions/editThought'
import { HOME_TOKEN } from '../constants'
import expandThoughts from '../selectors/expandThoughts'
import getSetting from '../selectors/getSetting'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'
import mergeUpdates from '../util/mergeUpdates'
import reducerFlow from '../util/reducerFlow'

export type UpdateThoughtsOptions = Omit<PushBatch, 'lexemeIndexUpdatesOld'> & {
  contextChain?: SimplePath[]
  cursorOffset?: number
  // callback for when the updates have been synced with IDB
  idbSynced?: () => void
  isLoading?: boolean
  pendingEdits?: editThoughtPayload[]
  /** By default, thoughts will be re-expanded with the fresh state. If a separate expandThoughts is called after updateThoughts within the same reducerFlow, then we can prevent expandThoughts here for better performance. See moveThought. */
  preventExpandThoughts?: boolean
  /** Allow non-pending thoughts to become pending. This is mainly used by freeThoughts. */
  overwritePending?: boolean
  /**
   * If true, check if the cursor is valid, and if not, move it to the closest valid ancestor.
   * This should only be used when the updates are coming from another device. For local updates, updateThoughts is typically called within a higher level reducer (e.g. moveThought) which handles all cursor updates. There would be false positives during local updates since the cursor is updated after updateThoughts.
   */
  repairCursor?: boolean
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
    lexemeIndexUpdates,
    thoughtIndexUpdates,
    recentlyEdited,
    updates,
    pendingDeletes,
    preventExpandThoughts,
    movePlacements,
    local = true,
    remote = true,
    idbSynced,
    isLoading,
    overwritePending,
    repairCursor,
  }: UpdateThoughtsOptions,
) => {
  if (Object.keys(thoughtIndexUpdates).length === 0 && Object.keys(lexemeIndexUpdates).length === 0) return state

  const thoughtIndexOld = { ...state.thoughts.thoughtIndex }
  const lexemeIndexOld = { ...state.thoughts.lexemeIndex }
  const lexemeIndexUpdatesOld = keyValueBy(lexemeIndexUpdates, key => ({ [key]: lexemeIndexOld[key] }))

  // Last-write-wins guard for reconcile updates (local === false), e.g. a forced pull (RecentlyEdited's
  // pullJumpHistory) or a cross-device onThoughtChange. The pulled snapshot is read asynchronously from
  // the data provider and may predate a local edit that landed in the meantime; if it overwrote the newer
  // in-memory thought it would corrupt parent/child links (e.g. after Swap Parent, producing a parent-chain
  // cycle and hanging the app). Drop any incoming thought that is no newer than the existing non-pending
  // thought.
  //
  // The comparison must be `<=`, not `<`: a single high-level action such as swapParent runs several
  // moveThought reducers synchronously in one reducerFlow, so every thought it touches is stamped with the
  // *same* lastUpdated millisecond, and each moveThought queues its own push batch — including the
  // transient intermediate state (e.g. the old parent's childrenMap before the moved child is removed). A
  // forced pull that reads that intermediate snapshot re-dispatches it with a lastUpdated equal to the
  // final state's, so a strict `<` would let it through and clobber the correct result (planting a child in
  // two contexts → cycle → hang, https://github.com/cybersemics/em/issues/3948). Because the final state is
  // emitted last, its lastUpdated is always >= any intermediate, so `<=` reliably discards the stale echo
  // while genuinely newer cross-device edits (strictly greater) still win.
  //
  // Skip when overwritePending is set (freeThoughts/deleteThought/generateThought intentionally overwrite)
  // and keep deletions (null) and missing/pending thoughts so pulls still load them.
  const thoughtIndexUpdatesFresh =
    local || overwritePending
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
  const thoughtIndex = mergeUpdates(thoughtIndexOld, thoughtIndexUpdatesFresh, { overwritePending })
  const lexemeIndex = mergeUpdates(lexemeIndexOld, lexemeIndexUpdates, { overwritePending })

  const recentlyEditedNew = recentlyEdited || state.recentlyEdited

  // updates are queued, detected by the pushQueue middleware, and sync'd with the local and remote stores
  const batch: PushBatch = {
    idbSynced,
    lexemeIndexUpdates,
    lexemeIndexUpdatesOld,
    local,
    movePlacements,
    pendingDeletes,
    recentlyEdited: recentlyEditedNew,
    remote,
    thoughtIndexUpdates: thoughtIndexUpdatesFresh,
    updates,
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
