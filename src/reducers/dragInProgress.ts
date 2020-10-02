import _ from 'lodash'
import { State } from '../util/initialState'
import { Path } from '../types'

interface Payload {
  value: string,
  draggingThought: Path,
  hoveringThought?: Path,
  offset?: number,
}

/** Sets dragInProgress. */
const dragInProgress = (state: State, { value, draggingThought, hoveringThought, offset }: Payload) => ({
  ...state,
  dragInProgress: value,
  draggingThought,
  hoveringThought,
  cursorOffset: offset || state.cursorOffset,
})

export default _.curryRight(dragInProgress)
