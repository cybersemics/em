import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import getElementFill from '../util/getElementFill'
import getThoughtById from './getThoughtById'

/**
 * Gets the fill color for a thought by its ID.
 * @param state - The Redux state.
 * @param thoughtId - The ID of the thought to check.
 * @returns The fill color or undefined if not found.
 */
const getThoughtFill = (state: State, thoughtId: ThoughtId | null): string | undefined => {
  if (!thoughtId) return undefined
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return undefined

  return getElementFill(thought.value)
}

export default getThoughtFill
