/** Sets the search. If not null, will open the search screen. */
export default (state, { value, archived }) => ({
  search: value,
  archived
})
