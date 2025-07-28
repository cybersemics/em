import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Track scroll status on mobile in order to prevent scrolling during drag-and-drop. (#3141) */
const scrolling = (state: State, { value }: { value: boolean }) => ({
  ...state,
  isScrolling: value,
})

/** Action-creator for scrolling. */
export const scrollingActionCreator =
  (payload: Parameters<typeof scrolling>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'scrolling', ...payload })

export default _.curryRight(scrolling)

// Register this action's metadata
registerActionMetadata('scrolling', {
  undoable: false,
})
