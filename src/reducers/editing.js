// track editing independently of cursor to allow navigation when keyboard is hidden
export default (state, { value }) => ({
  editing: value
})
