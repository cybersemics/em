import _ from 'lodash'
import CommandId from '../@types/CommandId'
import CommandType from '../@types/CommandType'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Reports a completed invocation. Consumers can observe the action without changing command execution. */
const commandSucceeded = (
  state: State,
  _payload: { commandId: CommandId; source: CommandType; userInitiated: boolean },
): State => state

/** Dispatches the invocation's command identity and input source after it settles successfully. */
export const commandSucceededActionCreator =
  (payload: Parameters<typeof commandSucceeded>[1]): Thunk =>
  dispatch => {
    dispatch({ type: 'commandSucceeded', ...payload })
  }
export default _.curryRight(commandSucceeded)
registerActionMetadata('commandSucceeded', { undoable: false })
