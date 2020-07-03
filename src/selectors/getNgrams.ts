import { stripPunctuation } from '../util'
import { getContexts, getNgrams } from '../selectors'
import { State } from '../util/initialState'

/** Returns an array of { text, numContexts, charIndex } objects consisting of the largest contiguous linked or unlinked ngrams of the given text.
 *
 * @param text Thought text.
 * @param numWords Maximum number of words in a subphrase.
 */
export default (state: State, text: string, numWords: number) => {

  const words = text.split(' ')

  // the list of ngrams that are recursively decomposed
  const ngrams = []

  // keep track of the starting index of the most recent unlinked (no other contexts) ngram
  // this allows the largest unlinked ngram to be
  let unlinkedStart = 0 // eslint-disable-line fp/no-let

  // keep track of the character index which will be passed in the result object for each ngram
  let charIndex = 0 // eslint-disable-line fp/no-let

  /** Recursively decoposes the current unlinked ngram. */
  const pushUnlinkedNgrams = (wordIndex: number) => {
    if (unlinkedStart < wordIndex) {
      const ngram = words.slice(unlinkedStart, wordIndex).join(' ')
      ngrams.push(numWords > 1 // eslint-disable-line fp/no-mutating-methods
        // RECURSION
        ? getNgrams(state, ngram, numWords - 1)
        : {
          text: ngram,
          contexts: [],
          index: charIndex - ngram.length - 1
        }
      )
    }
  }

  // loop through each ngram of the given phrase size (numWords)
  for (let i = 0; i < words.length - numWords; i++) { // eslint-disable-line fp/no-loops, fp/no-let

    const ngram = words.slice(i, i + numWords).join(' ')
    if (ngram.length > 0) {
      const contexts = getContexts(state, stripPunctuation(ngram))

      if (contexts.length > 0) {

        // decompose previous unlinked ngram
        pushUnlinkedNgrams(i)

        // ngram with other contexts
        ngrams.push({ // eslint-disable-line fp/no-mutating-methods
          text: ngram,
          contexts,
          index: charIndex
        })

        i += numWords - 1
        unlinkedStart = i + numWords
      }
    }

    charIndex += ngram.length + 1
  }

  // decompose final unlinked ngram
  pushUnlinkedNgrams(words.length)

  return ngrams.flat()
}
