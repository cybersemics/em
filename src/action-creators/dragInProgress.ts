import { Thunk, Path, SimplePath } from '../types'
import { DROP_TARGET } from '../constants'
import expandOnHoverTop from './expandOnHoverTop'
import expandOnHoverBottom from './expandOnHoverBottom'

interface Payload {
  value: boolean
  draggingThought?: SimplePath
  hoveringPath?: Path
  hoverId?: DROP_TARGET
  offset?: number
}

/** Drag in progress. */
const dragInProgress = (payload: Payload): Thunk => dispatch => {

  dispatch({
    type: 'dragInProgress',
    ...payload
  })

  dispatch(expandOnHoverTop())

  dispatch(expandOnHoverBottom())
}

export default dragInProgress
