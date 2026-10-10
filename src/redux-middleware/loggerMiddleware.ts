import { Dispatch, Middleware, UnknownAction } from 'redux'
import Index from '../@types/IndexType'
import State from '../@types/State'
import testFlags from '../e2e/testFlags'
import debugLog from '../util/debugLog'

/** Maximum number of editor overlays included in a structured updateThoughts entry. */
const MAX_SUMMARY_THOUGHTS = 20

/** Summarizes editor overlays without serializing document-write callbacks. */
const summarizeUpdateThoughts = (action: UnknownAction): Record<string, unknown> => {
  const overlays = Object.entries((action.thoughtUiUpdates ?? {}) as Index<State['thoughtUi'][string] | null>)
  return {
    actionType: 'updateThoughts',
    overlayCount: overlays.length,
    documentWrite: !!action.write,
    overlays: overlays.slice(0, MAX_SUMMARY_THOUGHTS).map(([id, ui]) => ({ id, ui })),
  }
}

/** Logs which original action types an undo or redo reverted or replayed, read from the patches popped off the undo/redo stack, so a move restored by undo is distinguishable from a fresh user move. */
const logUndoRedo = (stateBefore: State, stateAfter: State, actionType: string): void => {
  if (actionType !== 'undo' && actionType !== 'redo') return
  const stackBefore = actionType === 'undo' ? stateBefore.undoPatches : stateBefore.redoPatches
  const stackAfter = actionType === 'undo' ? stateAfter.undoPatches : stateAfter.redoPatches
  const popped = stackBefore.slice(stackAfter.length)
  if (popped.length === 0) return
  const actions = [...new Set(popped.flatMap(patch => patch.metadata.actionTypes))]
  debugLog.log(actionType, { steps: popped.length, actions })
}

/** Logs dispatched actions, structured thought updates, and undo/redo attribution. Document moves are captured inside the command transaction, before its previous-value reader expires. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loggerMiddleware: Middleware<any, State, Dispatch> = store => {
  return next => action => {
    // Capture pre-reduction UI history. This middleware runs after the thunk middleware, so
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

      // getState() after next(action) reflects the committed document and undo history, since middleware wraps
      // dispatch outside the command coordinator.
      if (stateBefore) {
        const stateAfter = store.getState()
        try {
          logUndoRedo(stateBefore, stateAfter, type ?? 'unknown')
        } catch {
          // Logging must never throw.
        }
      }
    }
  }
}
export default loggerMiddleware
