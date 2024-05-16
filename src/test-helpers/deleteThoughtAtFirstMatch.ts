import _ from 'lodash'
import Context from '../@types/Context'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import Thunk from '../@types/Thunk'
import deleteThought, { deleteThoughtActionCreator } from '../actions/deleteThought'
import contextToPath from '../selectors/contextToPath'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'

/**
 * Get thought and context for the given unranked path.
 */
const getThoughtAndParentPath = (state: State, at: string[]): [Thought, Path] => {
  const path = contextToPath(state, at)

  if (!path) throw new Error(`Ranked thoughts not found for context: ${at}`)

  const thought = pathToThought(state, path)

  const pathParent = rootedParentOf(state, path)

  return [thought, pathParent]
}
/**
 * Delete thought at the given unranked path first matched.
 */
const deleteThoughtAtFirstMatch = _.curryRight((state: State, at: string[]) => {
  const [thought, pathParent] = getThoughtAndParentPath(state, at)
  return deleteThought(state, {
    pathParent,
    thoughtId: thought.id,
  })
})

/**
 * Action creator that deletes thought at the given unranked path first matched.
 */
export const deleteThoughtAtFirstMatchActionCreator =
  (at: Context): Thunk =>
  (dispatch, getState) => {
    const [thought, pathParent] = getThoughtAndParentPath(getState(), at)
    dispatch(
      deleteThoughtActionCreator({
        pathParent,
        thoughtId: thought.id,
      }),
    )
  }
export default deleteThoughtAtFirstMatch
