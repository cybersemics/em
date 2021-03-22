import _ from 'lodash'
import { State } from '../util/initialState'
import { parentOf, head, headRank, headValue, pathToContext, reducerFlow, splitSentence } from '../util'
import { editableRender, editingValue, existingThoughtChange, newThought, setCursor } from '../reducers'
import { rootedParentOf, simplifyPath } from '../selectors'

/** Split thought by sentences. Create new thought for each sentence. Thought value, on which cursor is on, replace with first sentence. */
const splitSentences = (state: State) => {
  const { cursor } = state
  if (!cursor) return state
  const thoughts = pathToContext(cursor)
  const cursorContext = rootedParentOf(state, thoughts)
  const rank = headRank(cursor)
  const value = headValue(cursor)

  const sentences = splitSentence(value)

  if (sentences.length === 1) {
    return state
  }

  const [firstSentence, ...otherSentences] = sentences
  const newCursor = parentOf(cursor).concat({ ...head(cursor), value: firstSentence })

  const reducers = [
    existingThoughtChange({
      oldValue: value,
      newValue: firstSentence,
      context: cursorContext,
      path: simplifyPath(state, cursor),
      rankInContext: rank }),
    ...otherSentences.map(sentence => newThought({ value: sentence })),
    setCursor({ path: newCursor, offset: firstSentence.length }),
    editingValue({ value: firstSentence }),
    editableRender
  ]

  return reducerFlow(reducers)(state)
}

export default _.curryRight(splitSentences)
