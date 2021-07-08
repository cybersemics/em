import _ from 'lodash'
import { getChildrenRanked } from '../selectors'
import { moveThought } from '../reducers'
import { pathToContext, reducerFlow, unroot } from '../util'
import { State } from '../util/initialState'
import { SimplePath } from '../types'

/** Recalculate absolute ranks while preserving relative order to avoid rank precision errors. */
const rerank = (state: State, simplePath: SimplePath): State => {
  const context = pathToContext(simplePath)
  return reducerFlow(
    getChildrenRanked(state, context).map((child, i) =>
      moveThought({
        oldPath: unroot([...simplePath, child]),
        newPath: [...simplePath, { ...child, rank: i }],
        skipRerank: true,
      }),
    ),
  )(state)
}

export default _.curryRight(rerank)
