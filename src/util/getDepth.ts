import unroot from '../util/unroot'
import contextToThoughtId from '../selectors/contextToThoughtId'
import Context from '../@types/Context'
import State from '../@types/State'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Get max depth of a visible context. */
const getDepth = (state: State, context: Context): number => {
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

export default getDepth
