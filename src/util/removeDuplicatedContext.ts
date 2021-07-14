import { Context, Lexeme } from '../@types'
import { compareByRank, equalArrays, sort } from '../util'

/** Returns a new lexeme remove duplicated given context. */
export const removeDuplicatedContext = (lexeme: Lexeme, context: Context): Lexeme => {
  const topRankContext = sort(lexeme.contexts || [], compareByRank).find(parent => equalArrays(parent.context, context))

  return {
    ...lexeme,
    contexts: (lexeme.contexts || []).filter(
      parent => parent.rank === topRankContext?.rank || !equalArrays(parent.context, context),
    ),
  }
}
