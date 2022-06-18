import Context from '../@types/Context'
import Path from '../@types/Path'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'

/** Converts a Path to a Context. */
const pathToContext = (state: State, path: Path): Context =>
  path.map(id => {
    const thought = getThoughtById(state, id)
    if (!thought) throw Error('pathToContext: Missing thought with id ' + id)
    return thought.value
  })

export default pathToContext
