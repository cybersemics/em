import { unroot } from '../util'
import { Context, Index, LazyEnv, State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Parses all of the children of a context's =let into a LazyEnv. */
export const parseLet = (state: State, context: Context): LazyEnv => {
  const contextLet = unroot([...context, '=let'])
  const children = getAllChildrenAsThoughts(state, contextLet)
  return children.reduce<Index<Context>>((accum, child) => {
    const contextChild = unroot([...contextLet, child.value])
    return {
      ...accum,
      [child.value]: contextChild,
    }
  }, {})
}
