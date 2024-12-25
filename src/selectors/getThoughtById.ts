import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'

/**
 * Gets a Thought by its ThoughtId. Can be undefined if the Thought is not in the state.
 * The only time state.thoughts.thoughtIndex[id] is only undefined in rare 
 * circumstances after an async operation or unmount, e.g. CSSTransition, 
 * but it is possible nonetheless and should be typed accordingly.
 */
const getThoughtById = (state: State, id: ThoughtId) => state.thoughts.thoughtIndex[id]

export default getThoughtById
