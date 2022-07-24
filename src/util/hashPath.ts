import Path from '../@types/Path'

/**
 * Generates hash for path.
 */
const hashPath = (path: Path | null) => (path ? path.join('__SEP__') : '')

export default hashPath
