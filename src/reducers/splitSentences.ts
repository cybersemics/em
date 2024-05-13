import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import editThought from '../reducers/editThought'
import editableRender from '../reducers/editableRender'
import newThought from '../reducers/newThought'
import setCursor from '../reducers/setCursor'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import splitSentence from '../util/splitSentence'

/** Split thought by sentences. Create new thought for each sentence. Thought value, on which cursor is on, replace with first sentence. */
const splitSentences = (state: State) => {
  const { cursor } = state
  if (!cursor) return state
  const cursorThought = getThoughtById(state, head(cursor))
  const { value, rank } = cursorThought

  const sentences = splitSentence(value)

  if (sentences.length <= 1) {
    return state
  }

  const [firstSentence, ...otherSentences] = sentences

  const reducers = [
    editThought({
      oldValue: value,
      newValue: firstSentence,
      path: simplifyPath(state, cursor),
      rankInContext: rank,
    }),
    ...otherSentences.map(sentence => newThought({ value: sentence })),
    setCursor({ path: cursor, offset: getTextContentFromHTML(firstSentence).length }),
    editableRender,
  ]

  return reducerFlow(reducers)(state)
}

/** Action-creator for splitSentences. */
export const splitSentencesActionCreator = (): Thunk => dispatch => dispatch({ type: 'splitSentences' })

export default _.curryRight(splitSentences)
