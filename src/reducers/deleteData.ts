import _ from 'lodash'
import { deleteThought, updateLastUpdated } from '../data-providers/dexie'
import { hashThought, timestamp } from '../util'
import { getLexeme, getContextForThought } from '../selectors'
import { State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Deletes the value from the thoughtIndex. */
const deleteData = (state: State, { value }: { value: string }) => {
  const thoughtIndex = { ...state.thoughts.thoughtIndex }
  const lexeme = getLexeme(state, value)
  delete thoughtIndex[hashThought(value)] // eslint-disable-line fp/no-delete
  deleteThought(hashThought(value))
  updateLastUpdated(timestamp())

  // delete value from all contexts
  const contextIndex = { ...state.thoughts.contextIndex }
  if (lexeme && lexeme.contexts && lexeme.contexts.length > 0) {
    lexeme.contexts.forEach(thoughtId => {
      const thought = state.thoughts.contextIndex[thoughtId]
      const parent = state.thoughts.contextIndex[thought.parentId]

      if (!parent) {
        console.error(`Invariant Violation: parent of ${value} has no context: ${JSON.stringify(parent)}`)
        return state
      }
      const contextEncoded = parent.id
      const childrenNew = getAllChildrenAsThoughts(state, getContextForThought(state, parent.id)!).filter(
        child => hashThought(child.value) !== hashThought(value),
      )

      // delete the entry if there are no more children
      if (childrenNew.length === 0) {
        delete contextIndex[contextEncoded] // eslint-disable-line fp/no-delete
      }
      // otherwise update with new children
      else {
        contextIndex[contextEncoded] = {
          ...contextIndex[contextEncoded],
          children: childrenNew.map(({ id }) => id),
          lastUpdated: timestamp(),
        }
      }
    })
  }

  return {
    ...state,
    thoughtIndex,
    contextIndex,
    lastUpdated: timestamp(),
  }
}

export default _.curryRight(deleteData)
