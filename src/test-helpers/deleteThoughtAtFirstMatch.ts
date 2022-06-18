import _ from 'lodash'
import Context from '../@types/Context'
import Thought from '../@types/Thought'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { HOME_TOKEN } from '../constants'
import deleteThought from '../reducers/deleteThought'
import deleteThoughtActionCreator from '../action-creators/deleteThought'
import pathToThought from '../selectors/pathToThought'
import contextToPath from '../selectors/contextToPath'
import parentOf from '../util/parentOf'

/**
 * Get thought and context for the given unranked path.
 */
const getThoughtAndContext = (state: State, at: string[]): [Thought, Context] => {
  const path = contextToPath(state, at)

  if (!path) throw new Error(`Ranked thoughts not found for context: ${at}`)

  const thought = pathToThought(state, path)

  const context = at.length > 1 ? parentOf(at) : [HOME_TOKEN]

  return [thought, context]
}
/**
 * Delete thought at the given unranked path first matched.
 */
const deleteThoughtAtFirstMatch = _.curryRight((state: State, at: string[]) => {
  const [thought, context] = getThoughtAndContext(state, at)
  return deleteThought(state, {
    context,
    thoughtId: thought.id,
  })
})

/**
 * Action creator that deletes thought at the given unranked path first matched.
 */
export const deleteThoughtAtFirstMatchActionCreator =
  (at: Context): Thunk =>
  (dispatch, getState) => {
    const [thought, context] = getThoughtAndContext(getState(), at)
    dispatch(
      deleteThoughtActionCreator({
        context,
        thoughtId: thought.id,
      }),
    )
  }
export default deleteThoughtAtFirstMatch
