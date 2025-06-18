import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Track keyboard visibility on mobile independently of cursor to allow navigation when keyboard is hidden. */
const keyboardOpen = (state: State, { value }: { value: boolean }) => ({
  ...state,
  isKeyboardOpen: value,
})

/** Action-creator for keyboardOpen. */
export const keyboardOpenActionCreator =
  (payload: Parameters<typeof keyboardOpen>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'keyboardOpen', ...payload })

export default _.curryRight(keyboardOpen)

// Register this action's metadata
registerActionMetadata('keyboardOpen', {
  undoable: false,
})
