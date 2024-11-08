import State from '../@types/State'
import getContexts from '../selectors/getContexts'
import stripPunctuation from '../util/stripPunctuation'

/** Returns an array of { text, numContexts, charIndex } objects consisting of the largest contiguous linked or unlinked ngrams of the given text.
 *
 * @param text Thought text.
 * @param numWords Maximum number of words in a subphrase.
 */
const getNgrams = (state: State, text: string, numWords: number) => {
  const words = text.split(' ')

  // the list of ngrams that are recursively decomposed
  const ngrams = []

  // keep track of the starting index of the most recent unlinked (no other contexts) ngram
  // this allows the largest unlinked ngram to be
  let unlinkedStart = 0

  // keep track of the character index which will be passed in the result object for each ngram
  let charIndex = 0

  /** Recursively decoposes the current unlinked ngram. */
  const pushUnlinkedNgrams = (wordIndex: number) => {
    if (unlinkedStart < wordIndex) {
      const ngram = words.slice(unlinkedStart, wordIndex).join(' ')
      ngrams.push(
        numWords > 1
          ? // RECURSION
            getNgrams(state, ngram, numWords - 1)
          : {
              text: ngram,
              contexts: [],
              index: charIndex - ngram.length - 1,
            },
      )
    }
  }

  // loop through each ngram of the given phrase size (numWords)
  for (let i = 0; i < words.length - numWords; i++) {
    const ngram = words.slice(i, i + numWords).join(' ')
    if (ngram.length > 0) {
      const contexts = getContexts(state, stripPunctuation(ngram))

      if (contexts.length > 0) {
        // decompose previous unlinked ngram
        pushUnlinkedNgrams(i)

        // ngram with other contexts
        ngrams.push({
          text: ngram,
          contexts,
          index: charIndex,
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

export default getNgrams
