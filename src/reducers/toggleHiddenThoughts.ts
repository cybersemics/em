import { State } from '../types'

/** Shows or hides all hidden and metaprogramming thoughts. */
const toggleHiddenThoughts = (state: State) => ({
  ...state,
  showHiddenThoughts: !state.showHiddenThoughts,
})

export default toggleHiddenThoughts
