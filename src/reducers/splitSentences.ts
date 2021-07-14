import _ from 'lodash'
import {
  appendToPath,
  getTextContentFromHTML,
  head,
  headRank,
  headValue,
  parentOf,
  pathToContext,
  reducerFlow,
  splitSentence,
  hashContext,
} from '../util'
import { editableRender, editingValue, editThought, newThought, setCursor } from '../reducers'
import { rootedParentOf, simplifyPath } from '../selectors'
import { State } from '../@types'

/** Split thought by sentences. Create new thought for each sentence. Thought value, on which cursor is on, replace with first sentence. */
const splitSentences = (state: State) => {
  const { cursor } = state
  if (!cursor) return state
  const thoughts = pathToContext(cursor)
  const cursorContext = rootedParentOf(state, thoughts)
  const rank = headRank(cursor)
  const value = headValue(cursor)

  const sentences = splitSentence(value)

  if (sentences.length <= 1) {
    return state
  }

  const [firstSentence, ...otherSentences] = sentences
  const newCursor = appendToPath(parentOf(cursor), {
    ...head(cursor),
    value: firstSentence,
    id: hashContext([...pathToContext(parentOf(cursor)), firstSentence]),
  })

  const reducers = [
    editThought({
      oldValue: value,
      newValue: firstSentence,
      context: cursorContext,
      path: simplifyPath(state, cursor),
      rankInContext: rank,
    }),
    ...otherSentences.map(sentence => newThought({ value: sentence })),
    setCursor({ path: newCursor, offset: getTextContentFromHTML(firstSentence).length }),
    editingValue({ value: firstSentence }),
    editableRender,
  ]

  return reducerFlow(reducers)(state)
}

export default _.curryRight(splitSentences)
