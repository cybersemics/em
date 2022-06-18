import Path from '../@types/Path'
import ThoughtId from '../@types/ThoughtId'
import head from './head'

/** Returns the uuid of the last thought in a path. */
const headId = (path: Path): ThoughtId => head(path)

export default headId
