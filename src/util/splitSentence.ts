import { once } from './once'

/**
 * Splits given value by special characters.
 */
export const splitSentence = (value: string) => {
  // pattern1, single symbol: . ; ! ?
  // pattern2, multiple symbols: ?! !!! ...
  const mainSplitRegex = /[.;!?]+/g

  /** Checks if the value has no other main split characters  except one period at the end.
   * If so, allow split on comma only if there are no main  split characters in the value or has only one period at the end.
   */
  const hasOnlyPeriodAtEnd = once(() => /^[^.;!?]*\.$[^.;!?]*/.test(value.trim()))

  if (hasOnlyPeriodAtEnd()) return value.split(',').filter(s => s !== '').map(s => `${s.trim()}`)

  const spliters = value.match(mainSplitRegex)

  // When it cannot be split.
  if (!spliters) return [value]

  /**
   * When the setences can be split, it has multiple situations.
   */
  const sentences = value.split(mainSplitRegex)
  let filterOut: number[] = []
  let removeFront = 0

  const newSentences = sentences.map((s, i) => {
    if (filterOut.includes(i)) return s

    // remove first character ' or  " or ) or "), etc.
    if (removeFront !== 0) {
      s = s.slice(removeFront)
      removeFront = 0
    }

    // when it reaches the last sentense with no spliters on the end
    if (!spliters[i]) return s.trim()

    // when it reaches the last sentense with a spliter on the end
    s += spliters[i]
    if (!sentences[i + 1]) return s.trim()

    /**
     * In some cases, we need to recombine the sentences back to one.
     */
    let newSentence = s + sentences[i + 1]
    if (spliters[i + 1]) newSentence += spliters[i + 1]

    // Case1, when it ends with Mr., Dr., Apt., Oct.
    if (isAbbrev(s)) {
      filterOut = filterOut.concat(i + 1)
      return newSentence.trim()
    }

    // Case2, when it ends with a number like $5.3, 3.8M
    if (isDecimalNum(s, sentences[i + 1])) {
      filterOut = filterOut.concat(i + 1)
      return newSentence.trim()
    }

    // Case3, when it is i.e. or e.g.
    if (isDoubleDots(s, sentences[i + 1], spliters[i + 1])) {
      filterOut = filterOut.concat(i + 1)

      // add the sentence after the ".".
      if (spliters[i + 1] === '.' && sentences[i + 2]) {
        filterOut = filterOut.concat(i + 2)
        newSentence += sentences[i + 2]
        if (spliters[i + 2]) newSentence += spliters[i + 2]
      }
      return newSentence.trim()
    }

    /**
     * Case 4, when it ends with .", .), !), ?"), ;), etc.
     * The ", ), ") will stay on the front of the next sentence.
     * Hence, they are needed to be removed and added back to the end of the current sentence.
     */
    const pattern = sentences[i + 1].match(/^[)'"]+/)
    if (pattern) {
      removeFront = pattern[0].length
      return (s + sentences[i + 1].slice(0, removeFront)).trim()
    }

    return s.trim()
  })

  return newSentences.filter((s, i) => !filterOut.includes(i))
}

/**
 * Function: isAbbrev.
 *
 * @param word The sentence that has been split.
 * @returns A boolean value that tells whether the dot comes from an Abbrev word, and shouldn't be split
 * Examples: Mr. Dr. Apt. Feb.
 */
function isAbbrev (word : string) {
  const pattern = /[A-Z][a-z]*[.]$/g
  return !!word.match(pattern)
}

/**
 * Function: isDecimalNumber.
 *
 * @param str1 The charactor before the dot.
 * @param str2 The charactor after the dot.
 * @returns A bolean that says whether the dot comes from a decimal number, such as 5.76, $3.2, 2.54M, 20.1K.
 */
function isDecimalNum (str1 : string, str2: string) {
  return !!str1.match(/[0-9].$/) && !!str2.match(/^[0-9]/)
}

/**
 * Function: isDoubleDots., example: i.e., e.g..
 *
 * @param str1 The charactor before the first spliter.
 * @param str2 The charactor after the first spliter.
 * @param spliter2 The second spliter.
 * @returns A bolean value that says whether the dot comes from a decimal number, such as 5.76, $3.2, 2.54M, 20.1K.
 */
function isDoubleDots (str1 : string, str2: string, spliter2: string) {
  const iePattern = !!str1.match(/i.$/) && !!str2.match(/^e/) && !!spliter2.match(/^./)
  const egPattern = !!str1.match(/e.$/) && !!str2.match(/^g/) && !!spliter2.match(/^./)

  return iePattern || egPattern
}
