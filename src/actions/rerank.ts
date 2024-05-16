import _ from 'lodash'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import moveThought from '../actions/moveThought'
import { getChildrenRanked } from '../selectors/getChildren'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'

/** Recalculate absolute ranks while preserving relative order to avoid rank precision errors. */
const rerank = (state: State, simplePath: SimplePath): State => {
  return reducerFlow(
    getChildrenRanked(state, head(simplePath)).map((child, i) =>
      moveThought({
        oldPath: appendToPath(simplePath, child.id),
        newPath: appendToPath(simplePath, child.id),
        skipRerank: true,
        newRank: i,
      }),
    ),
  )(state)
}

export default _.curryRight(rerank)
