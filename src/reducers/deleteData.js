import * as localForage from 'localforage'

// util
import {
  hashContext,
  getThought,
  hashThought,
  timestamp,
} from '../util.js'

// SIDE EFFECTS: localStorage
export const deleteData = (state, { value, forceRender }) => {

  const thoughtIndex = Object.assign({}, state.thoughtIndex)
  const thought = getThought(value, state.thoughtIndex)
  delete thoughtIndex[hashThought(value)] // eslint-disable-line fp/no-delete
  localForage.removeItem('thoughtIndex-' + hashThought(value))
  localForage.setItem('lastUpdated', timestamp())

  // delete value from all contexts
  const contextIndex = Object.assign({}, state.contextIndex)
  if (thought && thought.memberOf && thought.memberOf.length > 0) {
    thought.memberOf.forEach(parent => {
      if (!parent || !parent.context) {
        console.error(`Invariant Violation: parent of ${value} has no context: ${JSON.toString(parent)}`)
        return
      }
      const contextEncoded = hashContext(parent.context)
      contextIndex[contextEncoded] = (contextIndex[contextEncoded] || [])
        .filter(child => hashThought(child.key) !== hashThought(value))
      if (contextIndex[contextEncoded].length === 0) {
        delete contextIndex[contextEncoded] // eslint-disable-line fp/no-delete
      }
    })
  }

  return {
    thoughtIndex,
    contextIndex,
    lastUpdated: timestamp(),
    dataNonce: state.dataNonce + (forceRender ? 1 : 0)
  }
}
