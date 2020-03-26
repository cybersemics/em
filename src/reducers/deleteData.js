import { deleteThought, updateLastUpdated } from '../db'

// util
import {
  hashContext,
  getThought,
  getThoughts,
  hashThought,
  timestamp,
} from '../util.js'

// reducers
import render from './render'

export default (state, { value, forceRender }) => {

  const thoughtIndex = Object.assign({}, state.thoughtIndex)
  const thought = getThought(value, state.thoughtIndex)
  delete thoughtIndex[hashThought(value)] // eslint-disable-line fp/no-delete
  deleteThought(hashThought(value))
  updateLastUpdated(timestamp())

  // delete value from all contexts
  const contextIndex = { ...state.contextIndex }
  if (thought && thought.contexts && thought.contexts.length > 0) {
    thought.contexts.forEach(parent => {

      if (!parent || !parent.context) {
        console.error(`Invariant Violation: parent of ${value} has no context: ${JSON.toString(parent)}`)
        return
      }

      const contextEncoded = hashContext(parent.context)
      const newThoughts = getThoughts(parent.context, state.thoughtIndex, state.contextIndex)
        .filter(child => hashThought(child.value) !== hashThought(value))

      // if this is the last thought in the context, delete the contextIndex entry
      if (newThoughts.length === 0) {
        delete contextIndex[contextEncoded] // eslint-disable-line fp/no-delete
      }
      else {
        contextIndex[contextEncoded].thoughts = newThoughts
      }
    })
  }

  return {
    ...render(state),
    thoughtIndex,
    contextIndex,
    lastUpdated: timestamp(),
  }
}
