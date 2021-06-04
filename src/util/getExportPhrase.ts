import { getDescendants } from '../selectors'
import { ellipsize, headValue, isRoot, pathToContext } from '../util'
import { State } from '../util/initialState'
import { Child, SimplePath } from '../types'

interface Options {

  // function to filter descendants when counting
  filterFunction?: (child: Child) => boolean,

  // override the value that is used as the label
  value?: string,

}

/** Counts the number of descendents of a path and returns a user-friendly phrase describing how many thoughts will be exported. */
export const getExportPhrase = (state: State, simplePath: SimplePath, { filterFunction, value }: Options = {}) => {

  const numDescendants = getDescendants(state, simplePath, { filterFunction }).length
  const context = pathToContext(simplePath)
  const label = ellipsize(value || headValue(simplePath))

  return isRoot(context)
    ? ` all ${numDescendants} thoughts`
    : `"${label}"${numDescendants > 0 ? ` and ${numDescendants} subthought${numDescendants === 1 ? '' : 's'}` : ''}`
}
