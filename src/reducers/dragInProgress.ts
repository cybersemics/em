import { State } from '../util/initialState'
import { Path } from '../types'

interface Payload {
  value: string,
  draggingThought: Path,
  hoveringThought: Path,
}

/** Sets dragInProgress. */
const dragInProgress = (state: State, { value, draggingThought, hoveringThought }: Payload) => ({
  ...state,
  dragInProgress: value,
  draggingThought,
  hoveringThought
})

export default dragInProgress
