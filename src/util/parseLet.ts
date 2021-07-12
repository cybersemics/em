import { getAllChildren } from '../selectors'
import { unroot } from '../util'
import { State } from '../util/initialState'
import { Context, Index, LazyEnv } from '../types'

/** Parses all of the children of a context's =let into a LazyEnv. */
export const parseLet = (state: State, context: Context): LazyEnv => {
  const contextLet = unroot([...context, '=let'])
  const children = getAllChildren(state, contextLet)
  return children.reduce<Index<Context>>((accum, child) => {
    const contextChild = unroot([...contextLet, child.value])
    return {
      ...accum,
      [child.value]: contextChild,
    }
  }, {})
}
