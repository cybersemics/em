import { getThought, getThoughts } from '../selectors'
import { compareByRank, pathToContext, sort } from '../util'
import { State } from '../util/initialState'
import { Child, Context, Path, SimplePath } from '../types'

/** Checks if an object is of type Path. */
const isPath = (o: Context | Path): o is Path =>
  o && o.length > 0 && Object.prototype.hasOwnProperty.call(o[0], 'value')

/** Generates children of a context sorted by their ranking. Returns a new object reference even if the children have not changed. */
const getThoughtsRanked = (state: State, context: Context | SimplePath): Child[] =>
  sort(
    getThoughts(state, isPath(context) ? pathToContext(context) : context)
      .filter(child => child.value != null && getThought(state, child.value)),
    compareByRank
  )

export default getThoughtsRanked
