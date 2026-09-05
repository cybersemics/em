import { Dispatch, Middleware, UnknownAction } from 'redux'
import Index from '../@types/IndexType'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import testFlags from '../e2e/testFlags'
import { getChildrenRanked } from '../selectors/getChildren'
import debugLog from '../util/debugLog'

/** Maximum number of thought summaries included in a structured updateThoughts entry. */
const MAX_SUMMARY_THOUGHTS = 20

/** Maximum number of individual move entries per action. Beyond this, one moveBatch entry with a sample is logged instead (e.g. a sort reranking a whole context). */
const MAX_MOVES = 10

/** Maximum characters of a thought value included in a log entry. */
const VALUE_MAX_LENGTH = 100

// Duplicate sibling ranks already reported, keyed by `${parentId}:${rank}`, so a persisting duplicate is warned about once rather than on every subsequent action that touches its parent.
const reportedDuplicateRanks = new Set<string>()

/** Truncates a thought value for compact log output. */
const truncateValue = (value: string): string =>
  value.length > VALUE_MAX_LENGTH ? `${value.slice(0, VALUE_MAX_LENGTH)}…` : value

/** Builds a structured summary of an updateThoughts action: per-thought id/value/rank/parentId/pending (capped at MAX_SUMMARY_THOUGHTS), plus counts and the local/remote flags. Far denser and more useful than the raw stringified action, whose truncation cuts JSON mid-field. */
const summarizeUpdateThoughts = (action: UnknownAction): Record<string, unknown> => {
  const thoughtUpdates = Object.entries((action.thoughtIndexUpdates ?? {}) as Index<Thought | null>)
  return {
    actionType: 'updateThoughts',
    thoughtCount: thoughtUpdates.length,
    lexemeCount: Object.keys((action.lexemeIndexUpdates ?? {}) as Index<unknown>).length,
    local: action.local !== false,
    remote: action.remote !== false,
    thoughts: thoughtUpdates.slice(0, MAX_SUMMARY_THOUGHTS).map(([id, thought]) =>
      thought
        ? {
            id,
            value: truncateValue(thought.value),
            rank: thought.rank,
            parentId: thought.parentId,
            ...(thought.pending ? { pending: true } : null),
          }
        : { id, deleted: true },
    ),
  }
}

/** Logs an integrity warning for each set of siblings that share an exact rank under the given parent. Duplicate ranks make sibling order ambiguous and are the signature of a data-integrity fault (see the safeguard in selectors/getRankAfter.ts). Warning only — the update itself is never blocked. */
const warnDuplicateRanks = (state: State, parentId: ThoughtId): void => {
  const children = getChildrenRanked(state, parentId)
  // children are sorted by rank, so duplicates are adjacent
  children.forEach((child, i) => {
    if (i === 0 || children[i - 1].rank !== child.rank) return
    const key = `${parentId}:${child.rank}`
    if (reportedDuplicateRanks.has(key)) return
    reportedDuplicateRanks.add(key)
    const duplicates = children
      .filter(sibling => sibling.rank === child.rank)
      .map(sibling => ({ id: sibling.id, value: truncateValue(sibling.value) }))
    debugLog.log('integrity', { issue: 'duplicateRank', parentId, rank: child.rank, thoughts: duplicates })
    console.warn(`Duplicate sibling rank ${child.rank} under thought ${parentId}`, duplicates)
  })
}

/** Diffs the thoughtIndex across one action and logs a self-describing `move` entry for every thought whose rank or parentId changed (loads and frees, where only one side exists, are skipped). Catches moves from every source — moveThought and the reducers that compose it, drag-and-drop, sort reranking, undo/redo, and remote sync — without special-casing any of them. Also runs the duplicate-rank integrity check on the parents of changed or added thoughts. */
const logThoughtMoves = (stateBefore: State, stateAfter: State, actionType: string): void => {
  const indexBefore = stateBefore.thoughts.thoughtIndex
  const indexAfter = stateAfter.thoughts.thoughtIndex
  if (indexBefore === indexAfter) return

  const moves = Object.values(indexAfter).flatMap(thought => {
    const old = indexBefore[thought.id]
    return old && old !== thought && (old.rank !== thought.rank || old.parentId !== thought.parentId)
      ? [
          {
            actionType,
            id: thought.id,
            value: truncateValue(thought.value),
            oldRank: old.rank,
            newRank: thought.rank,
            ...(old.parentId !== thought.parentId
              ? { oldParentId: old.parentId, newParentId: thought.parentId }
              : { parentId: thought.parentId }),
          },
        ]
      : []
  })

  if (moves.length <= MAX_MOVES) {
    moves.forEach(move => debugLog.log('move', move))
  } else {
    debugLog.log('moveBatch', { actionType, count: moves.length, sample: moves.slice(0, MAX_MOVES) })
  }

  const changedParentIds = new Set(
    Object.values(indexAfter)
      .filter(thought => indexBefore[thought.id] !== thought)
      .map(thought => thought.parentId),
  )
  changedParentIds.forEach(parentId => warnDuplicateRanks(stateAfter, parentId))
}

/** Logs which original action types an undo or redo reverted or replayed, read from the patches popped off the undo/redo stack, so a move restored by undo is distinguishable from a fresh user move. */
const logUndoRedo = (stateBefore: State, stateAfter: State, actionType: string): void => {
  if (actionType !== 'undo' && actionType !== 'redo') return
  const stackBefore = actionType === 'undo' ? stateBefore.undoPatches : stateBefore.redoPatches
  const stackAfter = actionType === 'undo' ? stateAfter.undoPatches : stateAfter.redoPatches
  const popped = stackBefore.slice(stackAfter.length)
  if (popped.length === 0) return
  const actions = [
    ...new Set(
      popped.map(patch => (patch.metadata.source === 'command' ? patch.metadata.commandId : patch.metadata.actionType)),
    ),
  ]
  debugLog.log(actionType, { steps: popped.length, actions })
}

/** Redux Middleware for logging all actions. Logs to the console when testFlags.logActions is set (useful for e2e/remote debugging when Redux Developer Tools are not available), and captures every action into the persistent debugLog when it is enabled (via the Debug Logging setting, or automatically on development and preview hosts) — along with derived forensics: structured updateThoughts summaries, a `move` entry for every rank or parent change, duplicate-sibling-rank integrity warnings, and undo/redo attribution. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loggerMiddleware: Middleware<any, State, Dispatch> = store => {
  return next => action => {
    // Capture pre-reduction state so thought moves can be diffed. This middleware runs after the thunk middleware, so
    // `action` is always a resolved plain action and getState() here reflects the state before this action's reducers.
    const stateBefore = debugLog.isEnabled() ? store.getState() : null

    next(action)

    const type = (action as UnknownAction).type

    if (testFlags.logActions) {
      console.info(type, action)
    }

    // Capture every dispatched action into the persistent rolling log. The payload is stringified (and truncated by
    // debugLog's field cap) so large actions cannot blow the buffer; updateThoughts gets a structured summary instead.
    if (debugLog.isEnabled() && action && typeof action === 'object') {
      if (type === 'updateThoughts') {
        debugLog.log('action', summarizeUpdateThoughts(action as UnknownAction))
      } else {
        const { type: _type, ...payload } = action as UnknownAction
        let payloadStr: string
        try {
          payloadStr = JSON.stringify(payload)
        } catch {
          payloadStr = String(payload)
        }
        debugLog.log('action', { actionType: type ?? 'unknown', payload: payloadStr })
      }

      // getState() after next(action) reflects the fully reduced state, including enhancer reducers (undo patches
      // applied, pushQueue drained), since middleware wraps dispatch outside the whole store.
      if (stateBefore) {
        const stateAfter = store.getState()
        try {
          logThoughtMoves(stateBefore, stateAfter, type ?? 'unknown')
          logUndoRedo(stateBefore, stateAfter, type ?? 'unknown')
        } catch {
          // Logging must never throw.
        }
      }
    }
  }
}
export default loggerMiddleware
