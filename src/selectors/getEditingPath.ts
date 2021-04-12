import _ from 'lodash'
import { parentOf, head } from '../util'
import { resolveArray, resolvePath } from '../util/memoizeResolvers'
import { State } from '../util/initialState'
import { SimplePath } from '../types'

/** Memoize resolver for getEditingPath. */
const resolve = (state: State, simplePath: SimplePath) =>
  resolveArray([resolvePath(state.cursor), resolvePath(simplePath)])

/** Swaps the head of a path with the cursor head. */
const getEditingPath = _.memoize((state: State, simplePath: SimplePath) =>
  [...parentOf(simplePath), head(state.cursor!)] as SimplePath
, resolve)

export default getEditingPath
