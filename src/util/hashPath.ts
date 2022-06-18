import Path from '../@types/Path'

/**
 * Generates hash for path.
 */
const hashPath = (path: Path) => path.join('__SEP__')

export default hashPath
