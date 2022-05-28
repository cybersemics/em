import { Index, LazyEnv, Path, State, ThoughtId } from '../@types'
import { head } from '../util'
import { findDescendant } from '../selectors'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Parses all of the children of a context's =let into a LazyEnv. */
export const parseLet = (state: State, path: Path): LazyEnv => {
  const idLet = findDescendant(state, head(path), '=let')
  const children = getAllChildrenAsThoughts(state, idLet)
  return children.reduce<Index<ThoughtId>>((accum, child) => {
    return {
      ...accum,
      [child.value]: child.id,
    }
  }, {})
}
