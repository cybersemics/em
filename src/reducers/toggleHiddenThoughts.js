/** Shows or hides all hidden and metaprogramming thoughts. */
export default state => ({
  ...state,
  showHiddenThoughts: !state.showHiddenThoughts,
})
