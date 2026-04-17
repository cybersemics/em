import getTextContentFromHTML from '../device/getTextContentFromHTML'
import * as selection from '../device/selection'
import isAbbreviation from './isAbbreviation'
import once from './once'
import trimHtml from './trimHtml'

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
 * Function: isStyle.
 *
 * @param str The previous sentence plus the previous splitter.
 * @returns A boolean that says whether the semicolon is part of a CSS style block.
 */
function isStyle(str: string) {
  const stylePattern = /style="[^"]+;$/
  return stylePattern.test(str)
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
 * The reduce function return a string, which is a combination of all the sentences, we then use __SEP__ to seperate each qualified sentence that can be split during the next step.
 */
const SEPARATOR_TOKEN = '__SEP__'

/**
 * Inserts separators in place of commas, unless the comma is part of a style within a font tag (#3455).
 */
function separateByComma(str: string) {
  const EMBEDDED_COMMA_TOKEN = '__COMMA__'
  const styleRegex = /style="[^"]+$/

  return str
    .split(',')
    .reduce((str, s) => {
      return str + s + (styleRegex.test(str + s) ? EMBEDDED_COMMA_TOKEN : SEPARATOR_TOKEN)
    }, '')
    .replaceAll(EMBEDDED_COMMA_TOKEN, ',')
}

interface SplitResult {
  value: string
  insertNewSubThought?: boolean
}

/**
 * Returns HTML between text offsets while preserving valid tag structure.
 *
 * @param htmlValue The source HTML.
 * @param startOffset Inclusive text offset.
 * @param endOffset Exclusive text offset.
 */
function sliceHtmlByTextOffsets(htmlValue: string, startOffset: number, endOffset: number) {
  const div = document.createElement('div')
  div.innerHTML = htmlValue

  const start = selection.offsetFromClosestParent(div, startOffset)
  const end = selection.offsetFromClosestParent(div, endOffset)
  if (!start?.node || !end?.node) return null

  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)

  const fragmentDiv = document.createElement('div')
  fragmentDiv.appendChild(range.cloneContents())
  return fragmentDiv.innerHTML
}

/**
 * Splits formatted HTML into parts by plain text sentence values.
 *
 * @param htmlValue The original HTML thought value.
 * @param plainValues The split values calculated from plain text.
 */
function splitFormattedHtmlByPlainValues(htmlValue: string, plainValues: string[]) {
  if (plainValues.length <= 1) return [trimHtml(htmlValue)]

  const fallbackValues = plainValues.map(splitValue => splitValue.trim())

  let remaining = htmlValue
  let remainingText = getTextContentFromHTML(remaining)
  const htmlValues: string[] = []

  for (const nextPlainValue of plainValues.slice(1)) {
    const splitOffset = remainingText.indexOf(nextPlainValue)
    if (splitOffset < 0) return fallbackValues

    const div = document.createElement('div')
    div.innerHTML = remaining

    const nodeOffset = selection.offsetFromClosestParent(div, splitOffset)
    if (!nodeOffset?.node) return fallbackValues

    const range = document.createRange()
    range.setStart(nodeOffset.node, nodeOffset.offset)
    range.setEnd(nodeOffset.node, nodeOffset.offset)

    const splitNodesResult = selection.splitNode(div, range)
    if (!splitNodesResult) return fallbackValues

    const leftDiv = document.createElement('div')
    const rightDiv = document.createElement('div')

    leftDiv.appendChild(splitNodesResult.left.cloneContents())
    rightDiv.appendChild(splitNodesResult.right.cloneContents())

    htmlValues.push(trimHtml(leftDiv.innerHTML))
    remaining = rightDiv.innerHTML
    remainingText = getTextContentFromHTML(remaining)
  }

  htmlValues.push(trimHtml(remaining))
  return htmlValues
}

/**
 * Splits formatted HTML by comma/"and" delimiters based on plain text offsets.
 *
 * @param htmlValue The original HTML thought value.
 * @param plainValue The plain text thought value.
 */
function splitFormattedHtmlByCommaAndAnd(htmlValue: string, plainValue: string) {
  const delimiterRegex = /^(,|and)/i
  const splitValues = plainValue.split(/,|and/i)
  let offset = 0

  return splitValues.reduce((accum: string[], splitValue) => {
    const startOffset = offset
    const endOffset = startOffset + splitValue.length
    const htmlSplitValue = sliceHtmlByTextOffsets(htmlValue, startOffset, endOffset)
    const formattedValue = htmlSplitValue ? trimHtml(htmlSplitValue) : splitValue.trim()

    const trailingText = plainValue.slice(endOffset)
    const delimiterMatch = trailingText.match(delimiterRegex)
    offset = endOffset + (delimiterMatch ? delimiterMatch[0].length : 0)

    return getTextContentFromHTML(formattedValue).trim() ? [...accum, formattedValue] : accum
  }, [])
}

/**
 * Splits given value by special characters.
 */
const splitSentence = (value: string): SplitResult[] => {
  const plainValue = getTextContentFromHTML(value)

  // Check for parenthetical content at the end of the thought first
  // pattern : ), ).
  // "This is a thought (and a subthought)" -> "-This is a thought   -and a subthought"
  const parentheticalMatch = plainValue.match(/^(.*?)\s*\((.*?)\)\.?$/)
  if (parentheticalMatch) {
    const [_, mainThought, subThought] = parentheticalMatch
    const parentheticalIndex = plainValue.indexOf('(', mainThought.length)
    const closingParentheticalIndex = plainValue.lastIndexOf(')')
    const mainHtml = sliceHtmlByTextOffsets(value, 0, mainThought.length)
    const subHtml =
      parentheticalIndex >= 0 && closingParentheticalIndex >= 0
        ? sliceHtmlByTextOffsets(value, parentheticalIndex + 1, closingParentheticalIndex)
        : null

    return [
      { value: trimHtml(mainHtml ?? mainThought.trim()) },
      { value: trimHtml(subHtml ?? subThought.trim()), insertNewSubThought: true },
    ].filter(s => s.value !== '')
  }

  // pattern1, single symbol: . ; ! ?
  // pattern2, multiple symbols: ?! !!! ...
  const mainSplitRegex = /[.;!?]+/g

  const sentenceSplitters = plainValue.match(mainSplitRegex)

  /**
   * Checks if the value has no other main split characters  except one period at the end, i.e. value is just one sentence.
   * If so, allow split on comma only if there are no main split characters in the value or has only one period at the end.
   */
  const hasOnlyPeriodAtEnd = once(() => /^[^.;!?]*\.$[^.;!?]*/.test(plainValue.trim()))

  // if we're sub-sentence or in one sentence territory, check for dash splitting first
  // e.g. "one - 1" -> "- one   - 1" (as child)
  if (!sentenceSplitters || hasOnlyPeriodAtEnd()) {
    // Check for dash (-, –, or —) and split into child if found
    // This handles Case 1: Split into child when there's only one sentence
    // Match the first dash that has content on both sides
    const dashMatch = plainValue.match(/^(.+?)\s*([-–—])\s*(.+)$/)
    if (dashMatch) {
      const [_, leftPart, __, rightPart] = dashMatch
      const trimmedLeft = leftPart.trim()
      const trimmedRight = rightPart.trim()
      // Only split if both parts have content
      if (trimmedLeft && trimmedRight) {
        const rightPartStart = plainValue.lastIndexOf(rightPart)
        const leftHtml = sliceHtmlByTextOffsets(value, 0, leftPart.length)
        const rightHtml = rightPartStart >= 0 ? sliceHtmlByTextOffsets(value, rightPartStart, plainValue.length) : null
        return [
          { value: trimHtml(leftHtml ?? trimmedLeft) },
          { value: trimHtml(rightHtml ?? trimmedRight), insertNewSubThought: true },
        ]
      }
    }

    // if we're sub-sentence or in one sentence territory, split by comma and "and"
    // e.g. "john, johnson, and john doe" -> "- john - johnson - john doe"
    const splitValues = plainValue
      .split(/,|and/i)
      .map(s => s.trim())
      .filter(s => s !== '')
    const values = plainValue !== value ? splitFormattedHtmlByCommaAndAnd(value, plainValue) : splitValues
    return values.map(value => ({ value }))
  }

  /**
   * When the sentences can be split, it has multiple situations.
   */
  const sentences = plainValue.split(mainSplitRegex)
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
    if (isAbbreviation(prevSentence, s) || isUrl(prevSentence, s) || isStyle(prevSentence)) {
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
  const hasOnlyPeriodSplitterAtEnd = !/;!?$/.test(resultSentences)

  const right =
    !resultSentences.match(SEPARATOR_TOKEN) && hasOnlyPeriodSplitterAtEnd
      ? separateByComma(resultSentences)
          .split(SEPARATOR_TOKEN)
          .filter(s => /\S+/.test(s))
          .map(s => s.trim())
          .join(SEPARATOR_TOKEN)
      : resultSentences
          .split(SEPARATOR_TOKEN)
          .map(s => s.trim())
          .join(SEPARATOR_TOKEN)

  const splitValues = right
    .split(SEPARATOR_TOKEN)
    .map(sentence => sentence.trim())
    .filter(Boolean)

  const values =
    splitValues.length > 1 && plainValue !== value ? splitFormattedHtmlByPlainValues(value, splitValues) : splitValues

  return values.map(value => ({ value }))
}

export default splitSentence
