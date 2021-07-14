import { Path } from '../@types'
import { head } from './head'

/** Returns the value of a the last thought in a path. */
export const headValue = (path: Path) => head(path).value
