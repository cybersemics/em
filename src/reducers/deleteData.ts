import _ from 'lodash'
import { deleteLexeme, updateLastUpdated } from '../data-providers/dexie'
import { hashThought, timestamp } from '../util'
import { getLexeme, thoughtToContext, getThoughtById } from '../selectors'
import { State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Deletes the value from the lexemeIndex. */
const deleteData = (state: State, { value }: { value: string }) => {
  const lexemeIndex = { ...state.thoughts.lexemeIndex }
  const lexeme = getLexeme(state, value)
  delete lexemeIndex[hashThought(value)] // eslint-disable-line fp/no-delete
  deleteLexeme(hashThought(value))
  updateLastUpdated(timestamp())

  // delete value from all contexts
  const thoughtIndex = { ...state.thoughts.thoughtIndex }
  if (lexeme && lexeme.contexts && lexeme.contexts.length > 0) {
    lexeme.contexts.forEach(thoughtId => {
      const thought = getThoughtById(state, thoughtId)
      const parent = getThoughtById(state, thought.parentId)

      if (!parent) {
        console.error(`Invariant Violation: parent of ${value} has no context: ${JSON.stringify(parent)}`)
        return state
      }
      const contextEncoded = parent.id
      const childrenNew = getAllChildrenAsThoughts(state, thoughtToContext(state, parent.id)!).filter(
        child => hashThought(child.value) !== hashThought(value),
      )

      // delete the entry if there are no more children
      if (childrenNew.length === 0) {
        delete thoughtIndex[contextEncoded] // eslint-disable-line fp/no-delete
      }
      // otherwise update with new children
      else {
        thoughtIndex[contextEncoded] = {
          ...thoughtIndex[contextEncoded],
          children: childrenNew.map(({ id }) => id),
          lastUpdated: timestamp(),
        }
      }
    })
  }

  return {
    ...state,
    lexemeIndex,
    thoughtIndex,
    lastUpdated: timestamp(),
  }
}

export default _.curryRight(deleteData)
