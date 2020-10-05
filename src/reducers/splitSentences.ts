import _ from 'lodash'
import { State } from '../util/initialState'
import { contextOf, head, headRank, headValue, pathToContext, reducerFlow, rootedContextOf } from '../util'
import { editableRender, existingThoughtChange, newThought, setCursor } from '../reducers'

/** Split thought by sentences. Create new thought for each sentence. Thought value, on which cursor is on, replace with first sentence. */
const splitSentences = (state: State) => {
  const { cursor } = state
  if (!cursor) return state
  const thoughts = pathToContext(cursor)
  const cursorContext = rootedContextOf(thoughts)
  const rank = headRank(cursor)
  const value = headValue(cursor)

  const splittedSentences = value.split(/[.!?]+/g).filter(s => s !== '').map(s => `${s.trim()}.`)

  if (splittedSentences.length === 1) {
    return state
  }

  const [firstSentence, ...otherSentences] = splittedSentences
  const newCursor = contextOf(cursor).concat({ ...head(cursor), value: firstSentence })

  const reducers = [
    existingThoughtChange({
      oldValue: value,
      newValue: firstSentence,
      context: cursorContext,
      thoughtsRanked: cursor,
      rankInContext: rank }),
    ...otherSentences.map(sentence => newThought({ value: sentence })),
    setCursor({ thoughtsRanked: newCursor, offset: firstSentence.length }),
    editableRender
  ]

  return reducerFlow(reducers)(state)
}

export default _.curryRight(splitSentences)
