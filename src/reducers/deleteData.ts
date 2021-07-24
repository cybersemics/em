import _ from 'lodash'
import { deleteThought, updateLastUpdated } from '../data-providers/dexie'
import { hashThought, timestamp } from '../util'
import { getLexeme, getAllChildren } from '../selectors'
import { State } from '../@types'

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
    lexeme.contexts.forEach(parent => {
      if (!parent || !parent.context) {
        console.error(`Invariant Violation: parent of ${value} has no context: ${JSON.stringify(parent)}`)
        return state
      }

      const contextEncoded = parent.id
      const childrenNew = getAllChildren(state, parent.context).filter(
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
          context: parent.context,
          children: childrenNew,
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
