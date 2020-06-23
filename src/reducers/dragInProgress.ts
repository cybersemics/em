import { State } from '../util/initialState'
import { Path } from '../types'

interface Payload {
  value: string,
  draggingThought: Path,
}

/** Sets dragInProgress. */
const dragInProgress = (state: State, { value, draggingThought }: Payload) => ({
  ...state,
  dragInProgress: value,
  draggingThought,
})

export default dragInProgress
