export default (state, { value = false, draggedThoughtsRanked }) => {
  return {
    highlightBullet: value,
    // Prevent setting new draggedThoughtRanked before, if previous value wasn't reset to undefined
    draggedThoughtsRanked: state.draggedThoughtsRanked ? !draggedThoughtsRanked ? undefined : state.draggedThoughtsRanked : draggedThoughtsRanked
  }
}
