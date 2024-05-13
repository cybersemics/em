import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
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

/** Update the initial thoughts with the clientId once it is ready. */
export const initThoughtsActionCreator =
  (clientId: string): Thunk =>
  (dispatch, getState) => {
    dispatch({
      type: 'initThoughts',
      clientId,
    })
  }

export default _.curryRight(initThoughts)
