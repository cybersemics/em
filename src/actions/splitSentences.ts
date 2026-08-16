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
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import splitSentence from '../util/splitSentence'
import categorize from './categorize'

/** Split thought by sentences. Create new thought for each sentence within a new empty category, so that the sentences remain distinct from the thought's siblings. Thought value, on which cursor is on, replace with first sentence. */
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

  // move the thought into a new empty category, which becomes the parent of all the sentences
  const stateCategorized = categorize(state)

  // categorize alerts and does nothing if the thought cannot be categorized, e.g. its parent is readonly
  if (!stateCategorized.cursor || getThoughtById(stateCategorized, head(cursor))?.parentId === cursorThought.parentId) {
    return stateCategorized
  }

  // categorize sets the cursor on the new empty category, of which the thought being split is now the only child
  const cursorNew = appendToPath(stateCategorized.cursor, head(cursor))

  const [firstSentence, ...otherSentences] = sentences

  const stateAfterSplit = reducerFlow([
    // newThought inserts relative to the cursor, so move the cursor back to the thought being split
    setCursor({ path: cursorNew }),
    editThought({
      oldValue: value,
      newValue: firstSentence.value,
      path: simplifyPath(stateCategorized, cursorNew),
    }),
    ...otherSentences.map(sentence =>
      newThought({ value: sentence.value, insertNewSubthought: sentence.insertNewSubThought }),
    ),
  ])(stateCategorized)

  const cursorForwardPath = otherSentences.some(sentence => sentence.insertNewSubThought)
    ? stateAfterSplit.cursor
    : null

  const reducers = [
    setCursor({ path: cursorNew, offset: getTextContentFromHTML(firstSentence.value).length }),
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
