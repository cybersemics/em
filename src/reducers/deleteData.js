import render from './render'

// util
import {
  hashContext,
  getThought,
  hashThought,
  timestamp,
} from '../util.js'

export default (state, { value }) => {

  const thoughtIndex = Object.assign({}, state.thoughtIndex)
  const thought = getThought(value, state.thoughtIndex)

  delete thoughtIndex[hashThought(value)] // eslint-disable-line fp/no-delete

  // delete value from all contexts
  const contextIndex = Object.assign({}, state.contextIndex)
  if (thought && thought.contexts && thought.contexts.length > 0) {
    thought.contexts.forEach(parent => {
      if (!parent || !parent.context) {
        console.error(`Invariant Violation: parent of ${value} has no context: ${JSON.toString(parent)}`)
        return
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
    thoughtIndex,
    contextIndex,
    lastUpdated: timestamp(),
  }
}
