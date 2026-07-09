import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import cursorHistory from '../actions/cursorHistory'
import editThought from '../actions/editThought'
import editableRender from '../actions/editableRender'
import newThought from '../actions/newThought'
import setCursor from '../actions/setCursor'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import splitSentence from '../util/splitSentence'

/** Split thought by sentences. Create new thought for each sentence. Thought value, on which cursor is on, replace with first sentence. */
const splitSentences = (state: State): State => {
  const { cursor } = state
  if (!cursor) return state
  const cursorThought = getThoughtById(state, head(cursor))
  if (!cursorThought) return state
  const { value } = cursorThought

  const sentences = splitSentence(value)

  if (sentences.length <= 1) {
    return state
  }

  const [firstSentence, ...otherSentences] = sentences

  const stateAfterSplit = reducerFlow([
    editThought({
      oldValue: value,
      newValue: firstSentence.value,
      path: simplifyPath(state, cursor),
    }),
    ...otherSentences.map(sentence =>
      newThought({ value: sentence.value, insertNewSubthought: sentence.insertNewSubThought }),
    ),
  ])(state)

  const cursorForwardPath = otherSentences.some(sentence => sentence.insertNewSubThought)
    ? stateAfterSplit.cursor
    : null

  const reducers = [
    setCursor({ path: cursor, offset: getTextContentFromHTML(firstSentence.value).length }),
    cursorForwardPath ? cursorHistory({ cursor: cursorForwardPath }) : null,
    editableRender,
  ]

  return reducerFlow(reducers)(stateAfterSplit)
}

/** Action-creator for splitSentences. */
export const splitSentencesActionCreator = (): Thunk => dispatch => dispatch({ type: 'splitSentences' })

export default _.curryRight(splitSentences)

// Register this action's metadata
registerActionMetadata('splitSentences', {
  undoable: true,
})
