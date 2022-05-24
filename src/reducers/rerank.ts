import _ from 'lodash'
import { getChildrenRankedById } from '../selectors'
import { moveThought } from '../reducers'
import { appendToPath, head, reducerFlow } from '../util'
import { SimplePath, State } from '../@types'

/** Recalculate absolute ranks while preserving relative order to avoid rank precision errors. */
const rerank = (state: State, simplePath: SimplePath): State => {
  return reducerFlow(
    getChildrenRankedById(state, head(simplePath)).map((child, i) =>
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
