import Context from '../@types/Context'
import Path from '../@types/Path'
import { EM_TOKEN } from '../constants'

/** Checks if an object is of type Path. */
const isPath = (o: Context | Path): o is Path => o.length > 0 && Object.prototype.hasOwnProperty.call(o[0], 'value')

/** Returns true if the Path is the EM_TOKEN. */
const isEM = (thoughts: Context | Path): boolean =>
  thoughts.length === 1 && (isPath(thoughts) ? thoughts[0] === EM_TOKEN : thoughts[0] === EM_TOKEN)

export default isEM
