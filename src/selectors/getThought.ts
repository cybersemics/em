// util
import { hashThought } from '../util'
import { PartialStateWithThoughts } from '../util/initialState'
import { Thought } from '../types'

/** Gets a single thought with a list of its contexts from the thoughtIndex. */
export const getThought = ({ thoughts: { thoughtIndex } }: PartialStateWithThoughts, value: string): Thought =>
  thoughtIndex[hashThought(value)]

// useful for debugging
// @ts-ignore
window.getThought = getThought

export default getThought
