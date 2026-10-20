import Path from '../@types/Path'
import State from '../@types/State'
import isAttribute from '../util/isAttribute'
import getThoughtById from './getThoughtById'

/** Returns true if the thought at the given path is a metaprogramming attribute or is inside one, e.g. `=pin`, or `color` and `tomato` in `=style/color/tomato`. Attributes are read-only: they can be navigated and viewed, but not edited, moved, or extended. See docs/metaprogramming.md. */
const isInAttribute = (state: State, path: Path): boolean =>
  path.some(id => isAttribute(getThoughtById(state, id)?.value ?? ''))

export default isInAttribute
