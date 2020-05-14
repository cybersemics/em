export default thoughtsRanked => (dispatch, getState) => {
  if (thoughtsRanked || getState().expandContextThought) {
    dispatch({
      type: 'expandContextThought',
      thoughtsRanked
    })
  }
}
