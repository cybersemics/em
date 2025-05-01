import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Sets the search limit. */
const searchLimit = (state: State, { value }: { value: number }) => ({
  ...state,
  searchLimit: value,
})

/** Action-creator for searchLimit. */
export const searchLimitActionCreator =
  (payload: Parameters<typeof searchLimit>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'searchLimit', ...payload })

export default _.curryRight(searchLimit)

// Register this action's metadata
registerActionMetadata('searchLimit', {
  undoable: true,
})
