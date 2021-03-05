import _ from 'lodash'
import { State } from '../util/initialState'
import { Context, Path, SimplePath } from '../types'
import { DROP_TARGET } from '../constants'

interface Payload {
  value: boolean,
  draggingThought?: SimplePath,
  hoveringThought?: Context,
  hoveringPath?: Path,
  hoverId?: DROP_TARGET,
  offset?: number,
}

/** Sets dragInProgress. */
const dragInProgress = (state: State, { value, draggingThought, hoveringThought, hoveringPath, hoverId, offset }: Payload): State => ({
  ...state,
  dragInProgress: value,
  draggingThought,
  hoveringThought,
  hoveringPath,
  hoverId,
  cursorOffset: offset || state.cursorOffset,
})

export default _.curryRight(dragInProgress)
