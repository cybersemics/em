import { timestamp } from './timestamp'
import { getLexeme } from '../selectors'
import { Context, Lexeme, State } from '../@types'
import { hashContext } from './hashContext'
import { unroot } from './unroot'

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
      id: hashContext(unroot([...context, value])),
    }),
    created: lexemeOld && lexemeOld.created ? lexemeOld.created : lastUpdated,
    lastUpdated,
  }
}
