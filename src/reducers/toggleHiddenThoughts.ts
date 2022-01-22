import { reducerFlow } from './../util/reducerFlow'
import { expandThoughts } from '../selectors'

/** Shows or hides all hidden and metaprogramming thoughts. */
const toggleHiddenThoughts = reducerFlow([
  state => ({
    ...state,
    showHiddenThoughts: !state.showHiddenThoughts,
  }),
  // calculate expanded with the toggled showHiddenThoughts
  state => ({
    ...state,
    expanded: expandThoughts(state, state.cursor),
  }),
])

export default toggleHiddenThoughts
