import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import Thunk from '../@types/Thunk'
import { DROP_TARGET } from '../constants'
import globals from '../globals'
import expandOnHoverBottom from './expandOnHoverBottom'
import expandOnHoverTop from './expandOnHoverTop'

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

    // when at the top of the viewport, bump the scroll bar to prevent gitching in Safari mobile
    // TODO: It still glitches out if you scroll back to the top during a drag
    if (document.documentElement.scrollTop === 0) {
      window.scrollTo(0, document.documentElement.scrollTop + 1)
    }

    dispatch(expandOnHoverTop())
    dispatch(expandOnHoverBottom())
  }

export default dragInProgress
