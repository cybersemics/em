import { Path } from '../@types'
import { equalThoughtValue } from '../util'

/** Determines whether a thought is archived or not. */
export const isThoughtArchived = (path: Path) => path.some(equalThoughtValue('=archive'))
