import _ from 'lodash'
import { hashThought, timestamp } from '../util'
import { getLexeme, getThoughtById } from '../selectors'
import { State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Deletes the value from the lexemeIndex. */
const deleteData = (state: State, { value }: { value: string }) => {
  const lexemeIndex = { ...state.thoughts.lexemeIndex }
  const lexeme = getLexeme(state, value)
  delete lexemeIndex[hashThought(value)] // eslint-disable-line fp/no-delete

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
      const childrenNew = getAllChildrenAsThoughts(state, parent.id).filter(
        child => hashThought(child.value) !== hashThought(value),
      )

      // delete the entry if there are no more children
      if (childrenNew.length === 0) {
        delete thoughtIndex[parent.id] // eslint-disable-line fp/no-delete
      }
      // otherwise update with new children
      else {
        thoughtIndex[parent.id] = {
          ...thoughtIndex[parent.id],
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
