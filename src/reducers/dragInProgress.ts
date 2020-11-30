import _ from 'lodash'
import { State } from '../util/initialState'
import { Context, SimplePath } from '../types'

interface Payload {
  value: boolean,
  draggingThought?: SimplePath,
  hoveringThought?: Context,
  offset?: number,
}

/** Sets dragInProgress. */
const dragInProgress = (state: State, { value, draggingThought, hoveringThought, offset }: Payload): State => ({
  ...state,
  dragInProgress: value,
  draggingThought,
  hoveringThought,
  cursorOffset: offset || state.cursorOffset,
})

export default _.curryRight(dragInProgress)
