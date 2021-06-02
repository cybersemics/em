import { getChildrenRanked } from '../selectors'
import { Context } from '../types'
import { State } from './initialState'
import { unroot } from './unroot'

/** Get max depth of a visible context. */
export const getDepth = (state: State, context: Context): number => {
  const children = getChildrenRanked(state, context) ?? []
  return children.length === 0
    ? 0
    : Math.max(...children.map(child => {
      const contextNew = [...unroot(context), child.value]
      return getDepth(state, contextNew)
    })) + 1
}
