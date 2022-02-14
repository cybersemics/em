import { Path } from '../@types'

/**
 * Generates hash for path.
 */
export const hashPath = (path: Path) => path.join('__SEP__')
