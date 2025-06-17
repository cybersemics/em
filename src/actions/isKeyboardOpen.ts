import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Track keyboard visibility independently of cursor to allow navigation when keyboard is hidden. */
const isKeyboardOpen = (state: State, { value }: { value: boolean }) => ({
  ...state,
  isKeyboardOpen: value,
})

/** Action-creator for isKeyboardOpen. */
export const isKeyboardOpenActionCreator =
  (payload: Parameters<typeof isKeyboardOpen>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'isKeyboardOpen', ...payload })

export default _.curryRight(isKeyboardOpen)

// Register this action's metadata
registerActionMetadata('isKeyboardOpen', {
  undoable: false,
})
