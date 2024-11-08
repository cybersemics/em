import Path from '../@types/Path'

/**
 * Generates hash for path.
 */
const hashPath = (path: Path | null) => (path ? path.join('') : '')

export default hashPath
