import { deleteThought, updateLastUpdated } from '../db'
import { hashContext, hashThought, timestamp } from '../util'
import { getThought, getThoughts } from '../selectors'
import { render } from '../reducers'
import { State } from '../util/initialState'

/** Deletes the value from the thoughtIndex. */
const deleteData = (state: State, { value, forceRender }: { value: string, forceRender?: boolean }) => {

  const thoughtIndex = { ...state.thoughts.thoughtIndex }
  const thought = getThought(state, value)
  delete thoughtIndex[hashThought(value)] // eslint-disable-line fp/no-delete
  deleteThought(hashThought(value))
  updateLastUpdated(timestamp())

  // delete value from all contexts
  const contextIndex = { ...state.thoughts.contextIndex }
  if (thought && thought.contexts && thought.contexts.length > 0) {
    thought.contexts.forEach(parent => {

      if (!parent || !parent.context) {
        console.error(`Invariant Violation: parent of ${value} has no context: ${JSON.stringify(parent)}`)
        return state
      }

      const contextEncoded = hashContext(parent.context)
      const childrenNew = getThoughts(state, parent.context)
        .filter(child => hashThought(child.value) !== hashThought(value))

      // delete the entry if there are no more children
      if (childrenNew.length === 0) {
        delete contextIndex[contextEncoded] // eslint-disable-line fp/no-delete
      }
      // otherwise update with new children
      else {
        contextIndex[contextEncoded] = {
          ...contextIndex[contextEncoded],
          children: childrenNew,
          lastUpdated: timestamp(),
        }
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

export default deleteData
