import Index from '../@types/IndexType'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import parentContextId from '../selectors/parentContextId'

const EMPTY_OBJECT = {}

/** Parses all of the children of a context's =let into a LazyEnv. Metaprogramming attributes are read from the thought that is displayed at the head of the path, which in the context view is the context. */
const parseLet = (state: State, path: Path): LazyEnv => {
  const idLet = findDescendant(state, parentContextId(state, path), '=let')
  const children = getAllChildrenAsThoughts(state, idLet)
  return children.reduce<Index<ThoughtId>>((accum, child) => {
    return {
      ...accum,
      [child.value]: child.id,
    }
  }, EMPTY_OBJECT)
}

export default parseLet
