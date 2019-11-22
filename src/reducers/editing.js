// track editing independently of cursor to allow navigation when keyboard is hidden
export const editing = (state, { value }) => ({
  editing: value
})
