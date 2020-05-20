import { store } from '../store'

// util
import { hashThought } from '../util'
import { InitialStateInterface } from '../util/initialState'
import { Thought } from '../types'

/** Gets a single thought with a list of its contexts from the thoughtIndex. */
export const getThought = ({ thoughts: { thoughtIndex } }: InitialStateInterface, value: string): Thought =>
  thoughtIndex[hashThought(value)]

// useful for debugging
//@ts-ignore
window.getThought = getThought

export default getThought
