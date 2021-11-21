import { Path, ThoughtId } from '../@types'
import { head } from '.'

/** Returns the uuid of the last thought in a path. */
export const headId = (path: Path): ThoughtId => head(path)
