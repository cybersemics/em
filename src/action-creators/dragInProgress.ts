import { Thunk, Path, SimplePath } from '../types'
import { DROP_TARGET } from '../constants'
import expandOnHoverTop from './expandOnHoverTop'
import expandOnHoverBottom from './expandOnHoverBottom'
import globals from '../globals'

interface Payload {
  value: boolean
  draggingThought?: SimplePath
  hoveringPath?: Path
  hoverId?: DROP_TARGET
  offset?: number
}

/** Drag in progress. */
const dragInProgress =
  (payload: Payload): Thunk =>
  dispatch => {
    // react-dnd stops propagation of the TouchMonitor's touchend event, so we need to turn off globals.touching here
    if (!payload.value) {
      globals.touching = false
    }

    dispatch({
      type: 'dragInProgress',
      ...payload,
    })

    dispatch(expandOnHoverTop())

    dispatch(expandOnHoverBottom())
  }

export default dragInProgress
