import { UnknownAction } from 'redux'
import Dispatch from '../@types/Dispatch'
import { CommandPatchMetadata } from '../@types/Patch'
import Thunk from '../@types/Thunk'

// Immutable invocation provenance on a bound dispatch, not enhancer state. Nested executors inherit it even after
// await. The enhancer receives this information only through the serialized beginCommand action.
const commandInvocation = Symbol('commandInvocation')
type CommandDispatch = Dispatch & { readonly [commandInvocation]?: CommandPatchMetadata }

/** Runs synchronous command work with observable, nested undo boundaries. The supplied dispatch retains the invocation
 * through arrays, thunks, and asynchronous continuations without leaving a boundary open across a promise. */
const withCommandDispatch = <T>(
  dispatch: Dispatch,
  invocation: CommandPatchMetadata,
  operation: (dispatch: Dispatch, metadata: CommandPatchMetadata) => T,
): T => {
  const metadata = (dispatch as CommandDispatch)[commandInvocation] ?? invocation
  let depth = 0
  /** Brackets only the synchronous portion of an operation, even when it returns a promise. */
  const run = <R>(callback: () => R): R => {
    if (depth > 0) return callback()
    dispatch({ type: 'beginCommand', metadata })
    depth++
    try {
      return callback()
    } finally {
      depth--
      dispatch({ type: 'endCommand' })
    }
  }

  /** Supplies the same dispatch to nested thunks while retaining the normal middleware and return-value contract. */
  const commandDispatch = (<R>(
    action: UnknownAction | Thunk<R> | (UnknownAction | Thunk<R> | null)[] | null,
  ): R | R[] | void =>
    action &&
    !Array.isArray(action) &&
    typeof action !== 'function' &&
    (action.type === 'beginCommand' || action.type === 'endCommand')
      ? dispatch(action)
      : run(() =>
          Array.isArray(action)
            ? (action.filter(item => item != null).map(item => commandDispatch(item)) as R[])
            : typeof action === 'function'
              ? // Keep reducer-shaped functions visible to doNotDispatchReducer before adapting valid thunks.
                action.toString().startsWith('(state,')
                ? dispatch(action)
                : dispatch((_, getState) => action(commandDispatch, getState))
              : dispatch(action),
        )) as Dispatch

  Object.defineProperty(commandDispatch, commandInvocation, { value: metadata })
  return run(() => operation(commandDispatch, metadata))
}

export default withCommandDispatch
