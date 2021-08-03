import { timestamp } from './timestamp'
import { getLexeme } from '../selectors'
import { Lexeme, State } from '../@types'

/** Create a new thought to a lexeme, merging collisions. */
export const addThought = (
  state: State,
  value: string,
  rank: number,
  lastUpdated = timestamp(),
  id: string,
): Lexeme => {
  const lexemeOld = getLexeme(state, value)
  return {
    ...lexemeOld,
    value,
    contexts: (lexemeOld ? lexemeOld.contexts || [] : []).concat({
      rank,
      id,
    }),
    created: lexemeOld && lexemeOld.created ? lexemeOld.created : lastUpdated,
    lastUpdated,
  }
}
