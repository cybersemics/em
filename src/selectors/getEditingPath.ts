import _ from 'lodash'
import { appendToPath, head, parentOf } from '../util'
import { resolveArray, resolvePath } from '../util/memoizeResolvers'
import { SimplePath, State } from '../@types'

/** Memoize resolver for getEditingPath. */
const resolve = (state: State, simplePath: SimplePath) =>
  resolveArray([resolvePath(state.cursor), resolvePath(simplePath)])

/** Swaps the head of a path with the cursor head. */
const getEditingPath = _.memoize(
  (state: State, simplePath: SimplePath) => appendToPath(parentOf(simplePath), head(state.cursor!)),
  resolve,
)

export default getEditingPath
