/** Track editing independently of cursor to allow navigation when keyboard is hidden. */
export default (state, { value }) => ({
  ...state,
  editing: value
})
