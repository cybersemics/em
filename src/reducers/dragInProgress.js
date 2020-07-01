/** Sets dragInProgress. */
export default (state, { value, draggingThought, hoveringThought }) => ({
  ...state,
  dragInProgress: value,
  draggingThought,
  hoveringThought,
})
