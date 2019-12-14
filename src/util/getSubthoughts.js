import { store } from '../store.js'

// util
import { flatten } from './flatten.js'
import { getContexts } from './getContexts.js'
import { stripPunctuation } from './stripPunctuation.js'

/** Returns an array of { text, numContexts, charIndex } objects consisting of the largest contiguous linked or unlinked subthoughts of the given text.
 * @param text Thought text.
 * @param numWords Maximum number of words in a subphrase
*/
export const getSubthoughts = (text, numWords, { data = store.getState().data } = {}) => {

  const words = text.split(' ')

  // the list of subthoughts that are recursively decomposed
  const subthoughts = []

  // keep track of the starting index of the most recent unlinked (no other contexts) subthought
  // this allows the largest unlinked subthought to be
  let unlinkedStart = 0 // eslint-disable-line fp/no-let

  // keep track of the character index which will be passed in the result object for each subthought
  let charIndex = 0 // eslint-disable-line fp/no-let

  /** recursively decoposes the current unlinked subthought */
  const pushUnlinkedSubthoughts = wordIndex => {
    if (unlinkedStart < wordIndex) {
      const subthought = words.slice(unlinkedStart, wordIndex).join(' ')
      subthoughts.push(numWords > 1 // eslint-disable-line fp/no-mutating-methods
        // RECURSION
        ? getSubthoughts(subthought, numWords - 1, { data })
        : {
          text: subthought,
          contexts: [],
          index: charIndex - subthought.length - 1
        }
      )
    }
  }

  // loop through each subthought of the given phrase size (numWords)
  for (let i = 0; i < words.length - numWords; i++) { // eslint-disable-line fp/no-loops, fp/no-let

    const subthought = words.slice(i, i + numWords).join(' ')
    if (subthought.length > 0) {
      const contexts = getContexts(stripPunctuation(subthought), data)

      if (contexts.length > 0) {

        // decompose previous unlinked subthought
        pushUnlinkedSubthoughts(i)

        // subthought with other contexts
        subthoughts.push({ // eslint-disable-line fp/no-mutating-methods
          text: subthought,
          contexts,
          index: charIndex
        })

        i += numWords - 1
        unlinkedStart = i + numWords
      }
    }

    charIndex += subthought.length + 1
  }

  // decompose final unlinked subthought
  pushUnlinkedSubthoughts(words.length)

  return flatten(subthoughts)
}
