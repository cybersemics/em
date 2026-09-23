import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Sets a dismissible or blocking error. */
const error = (state: State, { value, fatal }: { value: string | null; fatal?: boolean }) => ({
  ...state,
  [fatal ? 'fatalError' : 'error']: value,
})

/** Action-creator for error. */
export const errorActionCreator =
  ({ value, fatal }: Parameters<typeof error>[1]): Thunk =>
  (dispatch, getState) => {
    if (value !== getState()[fatal ? 'fatalError' : 'error']) {
      dispatch({ type: 'error', value, fatal })
    }
  }

export default _.curryRight(error)

// Register this action's metadata
registerActionMetadata('error', {
  undoable: false,
})
