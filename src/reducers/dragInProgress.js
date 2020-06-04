/** Sets dragInProgress. */
export default (state, { value, draggingThought }) => ({
  ...state,
  dragInProgress: value,
  draggingThought,
})
