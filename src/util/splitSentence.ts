import { once } from './once'
import { isAbbrev } from './isAbbreviation'

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
  let newSentences : string[] = [sentences[0] + spliters[0]]

  sentences.forEach((s : string, i : number) : void => {
    if (i === 0) return

    const prevSentence = newSentences[i - 1]
    const currSentence = spliters[i] ? s + spliters[i] : s
    const prevCurrSentence = spliters[i] ? prevSentence + s + spliters[i] : prevSentence + s

    /**
     * In some cases, we must combine the current sentence with the previous sentence to form one sentence.
     * Case1, ending with Mr., Dr., Apt., i.e., Ph.D..
     * Case2, ending with a number like $5.3, 3.8M.
     * Case3, ending with an email address.
     * Case4, ending with a website address.
     */
    if (isAbbrev(prevSentence, s, spliters[i]) || isDecimalNum(prevSentence, s) || isEmail(prevSentence, s, spliters[i]) || isUrl(prevSentence, s)) {

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

      newSentences = [...newSentences.slice(0, -1), prevSentence + currSentence.slice(0, removeFront), currSentence.slice(removeFront)]
      return
    }

    // When the original spliter is correct
    newSentences = [...newSentences, currSentence]

  })

  return newSentences.filter((s, i) => !filterOut.includes(i)).filter(s => s !== '').map(s => s.trim())
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
 * Function: isEmail.
 *
 * @param str1 The charactor before the dot.
 * @param s The current sentence which is right behind the spliter.
 * @param spliter2 The second spliter.
 * @returns A bolean that says whether the dot comes from an email address.
 */
function isEmail (str1 : string, s : string, spliter2 : string) {
  if (str1[str1.length - 1] === ' ') return false
  const isPartialEmail = (str1.match(/@/) || s.match(/@/)) && spliter2 === '.'

  const firstPart = str1.split(' ')
  const len = firstPart.length
  const isFullEmail = (firstPart[len - 1] + s.trimEnd()).match(/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)
  return isPartialEmail || isFullEmail
}

/**
 * Function: isUrl.
 *
 * @param str1 The charactor before the dot.
 * @param s The current sentence which is right behind the spliter.
 * @param spliter2 The second spliter.
 * @returns A bolean that says whether the dot comes from a url.
 */
function isUrl(str1 :string, s : string) {
  if (str1[str1.length - 1] === ' ') return false
  const finder = 'https://' || 'http://' || 'www'
  const index = str1.indexOf(finder)
  const isPartialUrl = index ? str1.slice(index).split(' ').length < 1 && str1.match(/.$/) : false

  // Regex Reference for Url from https://stackoverflow.com/questions/42618872/regex-for-website-or-url-validation .
  const urlPattern = /^((https?|ftp|smtp):\/\/)?(www.)?[a-z0-9]+(\.[a-z]{2,}){1,3}(#?\/?[a-zA-Z0-9#]+)*\/?(\?[a-zA-Z0-9-_]+=[a-zA-Z0-9-%]+&?)?$/

  const firstPart = str1.split(' ')
  const len = firstPart.length
  const isFullUrl = (firstPart[len - 1] + s.split(' ')[0]).match(urlPattern)

  return isPartialUrl || isFullUrl
}
