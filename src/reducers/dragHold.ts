import { State } from '../util/initialState'
import { Path } from '../types'

interface Payload {
  value: boolean,
  draggedThoughtsRanked?: Path,
}

/** Reducer for highlighting a bullet on click and hold. */
const dragHold = (state: State, { value = false, draggedThoughtsRanked }: Payload) => ({
  ...state,
  dragHold: value,
  // Prevent setting new draggedThoughtRanked before, if previous value wasn't reset to undefined
  draggedThoughtsRanked: state.draggedThoughtsRanked ? !draggedThoughtsRanked ? undefined : state.draggedThoughtsRanked : draggedThoughtsRanked
})

export default dragHold
