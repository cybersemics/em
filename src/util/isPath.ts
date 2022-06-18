import Context from '../@types/Context'
import Path from '../@types/Path'

/** Checks if an object is of type Path. */
const isPath = (o: Context | Path): o is Path => o.length > 0 && Object.prototype.hasOwnProperty.call(o[0], 'value')

export default isPath
