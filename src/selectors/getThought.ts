import { store } from '../store'

// util
import { hashThought } from '../util'

/** Gets a single thought with a list of its contexts from the thoughtIndex. */
export const getThought = ({ thoughts: { thoughtIndex } }, value) =>
  thoughtIndex[hashThought(value)]

// useful for debugging
window.getThought = value => getThought(store.getState(), value)

export default getThought
