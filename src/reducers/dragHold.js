/** Reducer for highlighting a bullet on click and hold */
export default (state, { value = false, draggedThoughtsRanked }) => ({
  dragHold: value,
  // Prevent setting new draggedThoughtRanked before, if previous value wasn't reset to undefined
  draggedThoughtsRanked: state.draggedThoughtsRanked ? !draggedThoughtsRanked ? undefined : state.draggedThoughtsRanked : draggedThoughtsRanked
})
