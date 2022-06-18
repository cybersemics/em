import timestamp from './timestamp'
import getLexeme from '../selectors/getLexeme'
import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'

/** Create a new thought to a lexeme, merging collisions. */
const addThought = (state: State, value: string, rank: number, lastUpdated = timestamp(), id: ThoughtId): Lexeme => {
  const lexemeOld = getLexeme(state, value)
  return {
    ...lexemeOld,
    value,
    contexts: (lexemeOld ? lexemeOld.contexts || [] : []).concat(id),
    created: lexemeOld && lexemeOld.created ? lexemeOld.created : lastUpdated,
    lastUpdated,
  }
}

export default addThought
