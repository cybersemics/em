// util
import { hashThought } from '../util'

export const getThought = ({ thoughtIndex }, value) =>
  thoughtIndex[hashThought(value)]

// useful for debugging
window.getThought = getThought

export default getThought
