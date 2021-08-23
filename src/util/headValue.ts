import { head } from './head'
import { Path } from '../@types'

// @MIGRATION_TODO: Fix all places that uses headValue
/** Returns the value of a the last thought in a path. */
export const headValue = (path: Path) => head(path)
