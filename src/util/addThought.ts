import { Context, Lexeme, State } from '../@types'
import { getLexeme } from '../selectors'
import { timestamp } from './timestamp'

/** Create a new thought to a lexeme, merging collisions. */
export const addThought = (
  state: State,
  value: string,
  rank: number,
  context: Context,
  lastUpdated = timestamp(),
): Lexeme => {
  const lexemeOld = getLexeme(state, value)
  return {
    ...lexemeOld,
    value,
    contexts: (lexemeOld ? lexemeOld.contexts || [] : []).concat({
      context,
      rank,
    }),
    created: lexemeOld && lexemeOld.created ? lexemeOld.created : lastUpdated,
    lastUpdated,
  }
}
