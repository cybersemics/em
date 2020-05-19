// util
import {
  contextOf,
  head,
  importHtml,
  pathToContext,
  rawTextToHtml,
  rootedContextOf,
  strip,
} from '../util'

// a list item tag
const regexpListItem = /<li(?:\s|>)/gmi

/** Imports the given text or html into the given thoughts
 *
    @param preventSetCursor  Prevents the default behavior of setting the cursor to the last thought at the first level
    @param preventSync       Prevent syncing state, turning this into a pure function.
    @param rawDestValue      When pasting after whitespace, e.g. pasting "b" after "a ", the normal destValue has already been trimmed, which would result in "ab". We need to pass the untrimmed destination value in so that it can be trimmed after concatenation.
    @param skipRoot          See importHtml @param.
 */
const importText = (thoughtsRanked, inputText, { preventSetCursor, preventSync, rawDestValue, skipRoot } = {}) => (dispatch, getState) => {
  const text = rawTextToHtml(inputText)
  const numLines = (text.match(regexpListItem) || []).length
  const destThought = head(thoughtsRanked)
  const destValue = rawDestValue || destThought.value
  const destRank = destThought.rank

  const state = getState()

  // if we are only importing a single line of text, then simply modify the current thought
  if (numLines === 1) {

    const newText = strip(text, { preserveFormatting: true })

    // get the range if there is one so that we can import over the selected text
    const selection = window.getSelection()
    const [startOffset, endOffset] = selection && selection.rangeCount > 0
      ? (() => {
        const range = selection.getRangeAt(0)
        const offsets = [range.startOffset, range.endOffset]
        range.collapse()
        return offsets
      })()
      : [0, 0]

    // insert the newText into the destValue in the correct place
    // trim after concatenating in case destValue has whitespace
    const newValue = (destValue.slice(0, startOffset) + newText + destValue.slice(endOffset)).trim()

    dispatch({
      type: 'existingThoughtChange',
      oldValue: destValue,
      newValue,
      context: rootedContextOf(pathToContext(thoughtsRanked)),
      thoughtsRanked
    })

    if (!preventSetCursor && thoughtsRanked) {
      dispatch({
        type: 'setCursor',
        thoughtsRanked: contextOf(thoughtsRanked).concat({ value: newValue, rank: destRank }),
        offset: startOffset + newText.length
      })
    }
  }
  else {

    const { lastThoughtFirstLevel, thoughtIndexUpdates, contextIndexUpdates } = importHtml(thoughtsRanked, text, { skipRoot, state })

    if (!preventSync) {
      dispatch({
        type: 'updateThoughts',
        thoughtIndexUpdates,
        contextIndexUpdates,
        forceRender: true,
        callback: () => {
          // restore the selection to the first imported thought
          if (!preventSetCursor && lastThoughtFirstLevel && lastThoughtFirstLevel.value) {
            dispatch({
              type: 'setCursor',
              thoughtsRanked: contextOf(thoughtsRanked).concat(lastThoughtFirstLevel),
              offset: lastThoughtFirstLevel.value.length
            })
          }
        }
      })
    }

    return Promise.resolve({
      contextIndexUpdates,
      thoughtIndexUpdates,
    })
  }

  return Promise.resolve({})
}

export default importText
