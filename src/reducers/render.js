/** Forces a full re-render. */
export default state => ({
  ...state,
  dataNonce: state.dataNonce + 1
})
