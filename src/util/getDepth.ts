import { unroot } from '../util'
import { contextToThoughtId } from '../selectors'
import { Context, State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Get max depth of a visible context. */
export const getDepth = (state: State, context: Context): number => {
  const id = contextToThoughtId(state, context)
  const children = getAllChildrenAsThoughts(state, id) ?? []
  return children.length === 0
    ? 0
    : Math.max(
        ...children.map(child => {
          const contextNew = [...unroot(context), child.value]
          return getDepth(state, contextNew)
        }),
      ) + 1
}
