import { UnknownAction } from 'redux'
import Dispatch from '../@types/Dispatch'
import { CommandAttributedAction, CommandPatchMetadata } from '../@types/Patch'
import Thunk from '../@types/Thunk'

const commandInvocation = Symbol('commandInvocation')
type CommandDispatch = Dispatch & { readonly [commandInvocation]?: CommandPatchMetadata }

/** Creates a dispatched command transaction whose real actions carry immutable command attribution. Nested transactions
 * inherit the outer invocation, and asynchronous continuations retain it through the supplied dispatch closure. */
const commandTransaction =
  <T>(
    invocation: CommandPatchMetadata,
    operation: (dispatch: Dispatch, metadata: CommandPatchMetadata) => T,
  ): Thunk<T> =>
  (dispatch, getState) => {
    const metadata = (dispatch as CommandDispatch)[commandInvocation] ?? invocation

    /** Dispatches actions and nested thunks with the transaction's command attribution. */
    const commandDispatch = (<R>(
      action: UnknownAction | Thunk<R> | (UnknownAction | Thunk<R> | null)[] | null,
    ): R | R[] | void =>
      action == null
        ? undefined
        : Array.isArray(action)
          ? (action.filter(item => item != null).map(item => commandDispatch(item)) as R[])
          : typeof action === 'function'
            ? // Keep reducer-shaped functions visible to doNotDispatchReducer before invoking valid thunks.
              action.toString().startsWith('(state,')
              ? dispatch(action)
              : action(commandDispatch, getState)
            : dispatch({ ...action, commandMetadata: metadata } satisfies UnknownAction &
                CommandAttributedAction)) as Dispatch

    Object.defineProperty(commandDispatch, commandInvocation, { value: metadata })
    return operation(commandDispatch, metadata)
  }

export default commandTransaction
