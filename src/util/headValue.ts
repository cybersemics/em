import { head } from './head'
import { Path } from '../types'

/** Returns the value of a the last thought in a path. */
export const headValue = (path: Path) => head(path).value
