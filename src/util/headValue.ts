import Path from '../@types/Path'
import ThoughtReaderState from '../@types/ThoughtReaderState'
import getThoughtById from '../selectors/getThoughtById'
import head from './head'

/** Returns the value of a the last thought in a path. */
const headValue = (state: ThoughtReaderState, path: Path): string | undefined =>
  getThoughtById(state, head(path))?.value

export default headValue
