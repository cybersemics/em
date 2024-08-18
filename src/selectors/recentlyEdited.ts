import Path from '../@types/Path'
import State from '../@types/State'
import pathToThought from './pathToThought'

/** Gets the list of recently edited thoughts from the jump history. Filters out thoughts that no longer exist. */
const recentlyEdited = (state: State) => state.jumpHistory.filter(path => path && pathToThought(state, path)) as Path[]

export default recentlyEdited
