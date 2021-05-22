import { once } from './once'

/**
 * Splits given value by special characters.
 */
export const splitSentence = (value: string) : string[] => {
  // pattern1, single symbol: . ; ! ?
  // pattern2, multiple symbols: ?! !!! ...
  const mainSplitRegex = /[.;!?]+/g

  /**
   * Checks if the value has no other main split characters  except one period at the end.
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
  let newSentences : string[] = []

  sentences.forEach((s : string, i : number) : void => {
    if (i === 0) {
      newSentences = [sentences[0] + spliters[0]]
      return
    }

    let prevSentence = newSentences[i - 1]
    let currSentence = s
    let prevCurrSentence = prevSentence + s

    if (spliters[i]) {
      currSentence += spliters[i]
      prevCurrSentence += spliters[i]
    }

    /**
     * In some cases, we must combine the current sentence with the previous sentence to form one sentence.
     * Case1, when it ends with Mr., Dr., Apt., Oct.
     * Case2, when it ends with a number like $5.3, 3.8M.
     * Case3, when it is i.e. or e.g. .
     */
    if (isAbbrev(prevSentence, s) || isDecimalNum(prevSentence, s) || isDoubleDots(prevSentence, s, spliters[i])) {
      filterOut = [...filterOut, i - 1]
      newSentences = [...newSentences, prevCurrSentence]
      return
    }

    /**
     * When it ends with .", .), !), ?"), ;), etc.
     * The ", ), ") will stay on the front of the next sentence.
     * Hence, they are needed to be removed and added back to the end of the current sentence.
     */
    const pattern = s.match(/^[)'"]+/)
    if (pattern) {
      const removeFront = pattern[0].length
      prevSentence += currSentence.slice(0, removeFront)
      prevCurrSentence = currSentence.slice(removeFront)

      newSentences = [...newSentences.slice(0, -1), prevSentence, prevCurrSentence]
      return
    }

    // When the original spliter is correct
    newSentences = [...newSentences, currSentence]

  })

  return newSentences.filter((s, i) => !filterOut.includes(i)).filter(s => s !== '').map(s => s.trim())
}

/**
 * Function: isAbbrev.
 *
 * @param word The sentence just added into the newSentences array.
 * @param s The current sentence which is right behind the spliter.
 * @returns A boolean value that tells whether the dot comes from an Abbrev word, and shouldn't be split
 * Examples: Mr. Dr. Apt. Feb.
 */
function isAbbrev (word : string, s : string) {
  const pattern = /[A-Z](?=[a-z]+\.$)/
  return !!word.match(pattern) && s[0] === ' '
}

/**
 * Function: isDecimalNumber.
 *
 * @param str1 The charactor before the dot.
 * @param str2 The charactor after the dot.
 * @returns A bolean that says whether the dot comes from a decimal number, such as 5.76, $3.2, 2.54M, 20.1K.
 */
function isDecimalNum (str1 : string, str2: string) {
  return !!str1.match(/[0-9]\.$/) && !!str2.match(/^[0-9]/)
}

/**
 * Function: isDoubleDots., example: i.e., e.g..
 *
 * @param str1 The charactor before the first spliter.
 * @param str2 The charactor after the first spliter.
 * @param spliter2 The second spliter.
 * @returns A bolean value that says whether it is i.e. or e.g..
 */
function isDoubleDots (str1 : string, str2: string, spliter2: string) {
  const ieHalfPattern = !!str1.match(/i\.$/) && !!str2.match(/^e/) && !!spliter2.match(/^\./)
  const egHalfPattern = !!str1.match(/e\.$/) && !!str2.match(/^g/) && !!spliter2.match(/^\./)

  const iePattern = !!str1.match(/i\.e\.$/)
  const egPattern = !!str1.match(/e\.g\.$/)

  return ieHalfPattern || egHalfPattern || iePattern || egPattern
}
