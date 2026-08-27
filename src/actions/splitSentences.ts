import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import cursorHistory from '../actions/cursorHistory'
import editThought from '../actions/editThought'
import editableRender from '../actions/editableRender'
import newThought from '../actions/newThought'
import setCursor from '../actions/setCursor'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import { getChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import splitSentence from '../util/splitSentence'
import categorize from './categorize'

/** Split thought by sentences. Create new thought for each sentence. When the sentences become siblings of a thought that already has siblings, they are placed within a new empty category so that they remain distinct from those siblings, and the cursor is left on the category. Thought value, on which cursor is on, replace with first sentence. */
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

  // The category only serves to keep the new thoughts distinct from the split thought's existing siblings, so it is omitted when there are none of either.
  // The sentences become siblings only when the first of them is not inserted as a subthought: a dash, colon, slash, or parenthetical split moves the cursor into a child, and everything after it is inserted within that child.
  const needsCategory = !otherSentences[0].insertNewSubThought && getChildren(state, cursorThought.parentId).length > 1

  // move the thought into a new empty category, which becomes the parent of all the sentences
  const stateCategorized = needsCategory ? categorize(state) : state

  // categorize sets the cursor on the new empty category, of which the thought being split is now the only child
  const categoryPath =
    needsCategory && getThoughtById(stateCategorized, head(cursor))?.parentId !== cursorThought.parentId
      ? stateCategorized.cursor
      : null

  // categorize alerts and does nothing if the thought cannot be categorized, e.g. its parent is readonly
  if (needsCategory && !categoryPath) {
    return stateCategorized
  }

  const cursorNew = categoryPath ? appendToPath(categoryPath, head(cursor)) : cursor

  const stateAfterSplit = reducerFlow([
    // newThought inserts relative to the cursor, so move the cursor back to the thought being split
    categoryPath ? setCursor({ path: cursorNew }) : null,
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
    // leave the cursor on the new empty category, ready for the user to name it, otherwise at the end of the first sentence
    // preserve the keyboard state from before the split, since newThought opens the keyboard
    setCursor({
      path: categoryPath ?? cursorNew,
      offset: categoryPath ? 0 : getTextContentFromHTML(firstSentence.value).length,
      isKeyboardOpen: state.isKeyboardOpen,
    }),
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
