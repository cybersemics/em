/** Real-time meta validation error status. */
export default (state, { value }) => ({
  ...state,
  invalidState: value
})
