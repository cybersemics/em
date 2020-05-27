import { deleteThought, updateLastUpdated } from '../db'

// util
import {
  hashContext,
  hashThought,
  timestamp,
} from '../util'

// selectors
import { getThought } from '../selectors'

// reducers
import render from './render'

/** Deletes the value from the thoughtIndex. */
export default (state, { value, forceRender }) => {

  const thoughtIndex = Object.assign({}, state.thoughtIndex)
  const thought = getThought(state, value)
  delete thoughtIndex[hashThought(value)] // eslint-disable-line fp/no-delete
  deleteThought(hashThought(value))
  updateLastUpdated(timestamp())

  // delete value from all contexts
  const contextIndex = Object.assign({}, state.contextIndex)
  if (thought && thought.contexts && thought.contexts.length > 0) {
    thought.contexts.forEach(parent => {
      if (!parent || !parent.context) {
        console.error(`Invariant Violation: parent of ${value} has no context: ${JSON.toString(parent)}`)
        return state
      }
      const contextEncoded = hashContext(parent.context)
      contextIndex[contextEncoded] = (contextIndex[contextEncoded] || [])
        .filter(child => hashThought(child.value) !== hashThought(value))
      if (contextIndex[contextEncoded].length === 0) {
        delete contextIndex[contextEncoded] // eslint-disable-line fp/no-delete
      }
    })
  }

  return {
    ...forceRender ? render(state) : state,
    thoughtIndex,
    contextIndex,
    lastUpdated: timestamp(),
  }
}
