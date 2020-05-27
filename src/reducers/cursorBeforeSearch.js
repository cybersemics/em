/** Stores the cursor so that it can be restored after the search is closed. */
export default (state, { value }) => ({
  ...state,
  cursorBeforeSearch: value
})
