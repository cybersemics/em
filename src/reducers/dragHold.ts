import _ from 'lodash'
import { State } from '../util/initialState'
import { SimplePath } from '../types'

interface Payload {
  value: boolean,
  simplePath?: SimplePath,
}

/** Reducer for highlighting a bullet on click and hold. */
const dragHold = (state: State, { value = false, simplePath }: Payload) => ({
  ...state,
  dragHold: value,
  // Prevent setting new draggedThoughtRanked before, if previous value wasn't reset to undefined
  draggedSimplePath: state.draggedSimplePath ? !simplePath ? undefined : state.draggedSimplePath : simplePath
})

export default _.curryRight(dragHold)
