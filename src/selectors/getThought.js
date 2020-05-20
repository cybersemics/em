// util
import { hashThought } from '../util'

/** Gets a single thought with a list of its contexts from the thoughtIndex. */
export const getThought = ({ thoughtIndex }, value) =>
  thoughtIndex[hashThought(value)]

// useful for debugging
window.getThought = getThought

export default getThought
