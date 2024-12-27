import isAbbreviation from './isAbbreviation'
import once from './once'

/**
 * Function: calculateRemoveFront.
 * When it ends with .' or .) or !) or ?") or ;), etc.
 * Splitting sentences will let those symbols sit on the front of the next sentence.
 * Hence, we calculate how many such characters needed to be removed and added back to the end of the previous sentence.
 *
 * @param str1 The previous sentence plus the previous splitter.
 * @param s The current sentence, which doesn't include the current splitter.
 * @param matched The array for the matched regular expression pattern.
 * @returns A number that indicates how many charcaters have to be moved to the previous sentence.
 */
function calculateRemoveFront(str1: string, s: string, matched: string[]) {
  const singleQ = str1.match(/'/g) || []
  const leftSingleCalib = !!s.match(/'/) && singleQ.length % 2 === 0 ? -1 : 0

  const doubleQ = str1.match(/"/g) || []
  const leftDoubleCalib = !!s.match(/"/) && doubleQ.length % 2 === 0 ? -1 : 0

  // Calculate how many spaces before the right quotation mark for the thought like: "One.  " Two.
  const leftEmptySpace = s.length - s.trimLeft().length

  return leftEmptySpace + matched[0].length + leftSingleCalib + leftDoubleCalib
}

/**
 * Function: isUrl.
 *
 * @param str1 The previous sentence plus the previous splitter.
 * @param s The current sentence, which doesn't include the current splitter.
 * @returns A boolean that says whether the dot comes from a url.
 */
function isUrl(str1: string, s: string) {
  // An empty space means the url has ended
  if (/[!;]$/.test(str1) || (str1[str1.length - 1] === '.' && s[0] === ' ')) return false

  // Regex Reference for Url from https://stackoverflow.com/questions/42618872/regex-for-website-or-url-validation with slight modification: change the + before = to *.
  const urlPattern =
    /((https?|ftp|smtp):\/\/)?(www.)?[a-z0-9]+(\.[a-z]{2,}){1,3}(#?\/?[a-zA-Z0-9#]+)*\/?(\?[a-zA-Z0-9-_]*=[a-zA-Z0-9-%]+&?)?/

  const firstPart = str1.split(' ')
  const len = firstPart.length
  const combinedSentence = firstPart[len - 1] + s.split(' ')[0]

  return urlPattern.test(combinedSentence)
}

/**
 * Splits given value by special characters.
 */
const splitSentence = (value: string): string[] => {
  // pattern1, single symbol: . ; ! ?
  // pattern2, multiple symbols: ?! !!! ...
  const mainSplitRegex = /[.;!?]+/g

  const sentenceSplitters = value.match(mainSplitRegex)

  /**
   * Checks if the value has no other main split characters  except one period at the end, i.e. value is just one sentence.
   * If so, allow split on comma only if there are no main split characters in the value or has only one period at the end.
   */
  const hasOnlyPeriodAtEnd = once(() => /^[^.;!?]*\.$[^.;!?]*/.test(value.trim()))

  // if we're sub-sentence or in one sentence territory, split by comma and "and"
  // e.g. "john, johnson, and john doe" -> "- john - johnson - john doe"
  if (!sentenceSplitters || hasOnlyPeriodAtEnd())
    return value
      .split(/,|and/i)
      .map(s => s.trim())
      .filter(s => s !== '')

  /**
   * When the setences can be split, it has multiple situations.
   */
  const sentences = value.split(mainSplitRegex)

  /**
   * The reduce function return a string, which is a combination of all the sentences, we then use __SEP__ to seperate each qualified sentence that can be split during the next step.
   */
  const SEPARATOR_TOKEN = '__SEP__'
  const initialValue = sentences[0]

  const resultSentences = sentences.reduce((newSentence: string, s: string, i: number) => {
    if (i === 0) return newSentence + sentenceSplitters[0]

    const separatorIndex = newSentence.lastIndexOf(SEPARATOR_TOKEN)
    const prevSentence = separatorIndex < 0 ? newSentence : newSentence.slice(separatorIndex + 7)
    const currSentence = sentenceSplitters[i] ? s + sentenceSplitters[i] : s

    /**
     * Combine the current sentence with the previous sentence to form one new sentence if it is the below conditions:
     * Case1: ending with url address
     * Case2: ending with Mr., Dr., Apt., i.e., Ph.D..
     */
    if (isAbbreviation(prevSentence, s) || isUrl(prevSentence, s)) {
      return newSentence + currSentence
    }

    /**
     * Case3: ending with .", .), !), ?"), ;), etc.
     * The ", ), ") will stay on the front of the next sentence.
     * Hence, they are needed to be removed and added back to the end of the current sentence.
     */
    const matched = s.trimLeft().match(/^[)'"]+/)
    const removeFront = matched !== null ? calculateRemoveFront(prevSentence, s, matched) : 0
    if (matched !== null) {
      if (removeFront === 0) return newSentence + SEPARATOR_TOKEN + currSentence

      const backPart = currSentence.slice(removeFront)
      const frontPart = currSentence.slice(0, removeFront)
      return backPart ? newSentence + frontPart + SEPARATOR_TOKEN + backPart : newSentence + frontPart
    }

    /**
     * Case4: ending with a number like $5.3, 3.8M.
     * Case5: ending with an email address.
     * Case6: ending with a name, e.g. react.js
     * Case7: ending with an IP address.
     */
    if (prevSentence[prevSentence.length - 1] === '.' && s[0] !== ' ') return newSentence + currSentence

    // On other conditions,the original splitter is the real splitter
    return newSentence + SEPARATOR_TOKEN + currSentence
  }, initialValue)

  // if the return string is one sentence that ends with no other main split characters except one period at the end, split the thought by comma
  const res = resultSentences.split(SEPARATOR_TOKEN).filter(s => /\S+/.test(s))
  const hasOnlyPeriodSplitterAtEnd = !/;!?$/.test(resultSentences)
  if (res.length === 1 && hasOnlyPeriodSplitterAtEnd) {
    return resultSentences
      .replace(/,/g, `${SEPARATOR_TOKEN}`)
      .split(SEPARATOR_TOKEN)
      .filter(s => /\S+/.test(s))
      .map(s => s.trim())
  }

  return res.map(s => s.trim())
}

export default splitSentence
