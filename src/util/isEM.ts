import Context from '../@types/Context'
import Path from '../@types/Path'
import { EM_TOKEN } from '../constants'
import isPath from './isPath'

/** Returns true if the Path is the EM_TOKEN. */
const isEM = (thoughts: Context | Path): boolean =>
  thoughts.length === 1 && (isPath(thoughts) ? thoughts[0] === EM_TOKEN : thoughts[0] === EM_TOKEN)

export default isEM
