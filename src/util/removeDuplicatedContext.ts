import { Context, Lexeme } from '../types'
import { compareByRank, equalArrays, sort } from '../util'

/** Returns a new thought remove duplicated given context. */
export const removeDuplicatedContext = (thought: Lexeme, context: Context) => {

  const topRankContext = sort(thought.contexts || [], compareByRank)
    .find(parent => equalArrays(parent.context, context))

  return {
    ...thought,
    contexts: (thought.contexts || [])
      .filter(parent =>
        parent.rank === topRankContext.rank || !equalArrays(parent.context, context)
      )
  }
}
