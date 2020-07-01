import { Path } from '../types'
import { head } from '../util'

/** Returns the uuid of the last thought in a path. */
export const headId = (path: Path): string | undefined => head(path).id
