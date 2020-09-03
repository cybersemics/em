import _ from 'lodash'
import { State } from '../util/initialState'
import { contextOf, head, headRank, headValue, pathToContext, reducerFlow } from '../util'
import { existingThoughtChange, newThought, setCursor } from '../reducers'
import { ROOT_TOKEN } from '../constants'

/** .... */
const splitSentences = (state: State) => {
  const { cursor } = state
  if (!cursor) return state
  const thoughts = pathToContext(cursor)
  const cursorContext = thoughts.length > 1 ? contextOf(pathToContext(cursor)) : [ROOT_TOKEN]
  cursorContext.toString()
  const rank = headRank(cursor)
  const value = headValue(cursor)
  const regExp = /[^.!?]+[.!?]+/g

  if (!regExp.test(value)) {
    console.log('This thought has no sentences')
    return state
  }

  const splittedSentences = value.match(regExp)!.map(s => s.trim())

  if (splittedSentences.length === 1) {
    console.log('This thought has only one sentence')
    return state
  }

  const firstSentence = _.head(splittedSentences)!
  const otherSentences = _.tail(splittedSentences)!
  const newCursor = contextOf(cursor).concat({ ...head(cursor), value: firstSentence })

  const reducers = [
    existingThoughtChange({ oldValue: value, newValue: firstSentence, context: cursorContext, thoughtsRanked: cursor, rankInContext: rank }),
    ...otherSentences.map(sentence => newThought({ value: sentence })),
    setCursor({ thoughtsRanked: newCursor })
  ]

  return reducerFlow(reducers)(state)
}

export default _.curryRight(splitSentences)
