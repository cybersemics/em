/** Expands the inline breadcrumbs of a context in the context view. */
export default thoughtsRanked => (dispatch, getState) => {
  if (thoughtsRanked || getState().expandContextThought) {
    dispatch({
      type: 'expandContextThought',
      thoughtsRanked
    })
  }
}
