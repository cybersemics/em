import _ from 'lodash'
import State from '../@types/State'
import keyValueBy from '../util/keyValueBy'

/** Set the initial thoughts' updatedBy field once the cliendId is ready. */
const initThoughts = (state: State, { clientId }: { clientId: string }) => ({
  ...state,
  // Set proper updatedBy now that clientId is ready.
  thoughts: {
    ...state.thoughts,
    thoughtIndex: {
      ...keyValueBy(state.thoughts.thoughtIndex, (id, thought) => ({
        [id]: thought.updatedBy
          ? thought
          : {
              ...thought,
              updatedBy: clientId,
            },
      })),
    },
    lexemeIndex: {
      ...keyValueBy(state.thoughts.lexemeIndex, (key, lexeme) => ({
        [key]: lexeme.updatedBy
          ? lexeme
          : {
              ...lexeme,
              updatedBy: clientId,
            },
      })),
    },
  },
})

export default _.curryRight(initThoughts)
