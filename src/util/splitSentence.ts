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

interface SplitResult {
  value: string
  insertNewSubThought?: boolean
}

/**
 * Splits HTML at a text offset into the HTML before and after the offset, with formatting tags re-balanced onto both halves.
 *
 * @param htmlValue The source HTML.
 * @param offset The text offset to split at.
 */
function splitHtmlAtTextOffset(htmlValue: string, offset: number): { left: string; right: string } {
  const div = document.createElement('div')
  div.innerHTML = htmlValue

  const nodeOffset = selection.offsetFromClosestParent(div, offset)
  if (!nodeOffset?.node) throw new Error(`Unable to map text offset to an HTML node: ${offset}`)

  const range = document.createRange()
  range.setStart(nodeOffset.node, nodeOffset.offset)
  range.setEnd(nodeOffset.node, nodeOffset.offset)

  const splitNodesResult = selection.splitNode(div, range)
  if (!splitNodesResult) return { left: '', right: '' }

  const leftDiv = document.createElement('div')
  const rightDiv = document.createElement('div')
  leftDiv.appendChild(splitNodesResult.left.cloneContents())
  rightDiv.appendChild(splitNodesResult.right.cloneContents())

  return { left: leftDiv.innerHTML, right: rightDiv.innerHTML }
}

/**
 * Returns HTML between text offsets while preserving valid tag structure.
 *
 * @param htmlValue The source HTML.
 * @param startOffset Inclusive text offset.
 * @param endOffset Exclusive text offset.
 */
function sliceHtmlByTextOffsets(htmlValue: string, startOffset: number, endOffset: number): string {
  // Split at the end offset, then split the left half at the start offset.
  // A single Range spanning both offsets cannot be used: when both boundaries fall inside the same text node, cloneContents returns a bare text node and all surrounding formatting tags are dropped (#4229). splitNode anchors one boundary at the root so that the formatting ancestors are re-balanced onto each half.
  const { left } = splitHtmlAtTextOffset(htmlValue, endOffset)
  return splitHtmlAtTextOffset(left, startOffset).right
}

/**
 * Splits formatted HTML into parts by plain text sentence values.
 *
 * @param htmlValue The original HTML thought value.
 * @param plainValues The split values calculated from plain text.
 */
function splitFormattedHtmlByPlainValues(htmlValue: string, plainValues: string[]): string[] {
  if (plainValues.length <= 1) return [trimHtml(htmlValue)]

  let remaining = htmlValue
  let remainingText = getTextContentFromHTML(remaining)
  const htmlValues: string[] = []

  for (const nextPlainValue of plainValues.slice(1)) {
    const splitOffset = remainingText.indexOf(nextPlainValue)
    if (splitOffset < 0) {
      throw new Error(`Unable to find split boundary in remaining text: "${nextPlainValue}"`)
    }

    const div = document.createElement('div')
    div.innerHTML = remaining

    const nodeOffset = selection.offsetFromClosestParent(div, splitOffset)
    if (!nodeOffset?.node) throw new Error(`Unable to resolve split node at offset: ${splitOffset}`)

    const range = document.createRange()
    range.setStart(nodeOffset.node, nodeOffset.offset)
    range.setEnd(nodeOffset.node, nodeOffset.offset)

    const splitNodesResult = selection.splitNode(div, range)
    if (!splitNodesResult) throw new Error('Unable to split HTML node at sentence boundary')

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

/** Symbols that delimit sub-sentences, e.g. "a → b → c" (#4393). A colon is not included: it splits into a child rather than a sibling, which is handled before the sub-sentence split. */
const symbolSplitRegex = /[↑↓←→+]/

/** Matches a sub-sentence symbol at the beginning of the remaining text. */
const symbolLeadingRegex = /^[↑↓←→+]/

/**
 * Returns the punctuation delimiter that splits a single sentence into sub-sentences: a comma, or one of the symbols ↑↓←→+ when there is no comma. Returns null when the value contains neither.
 *
 * @param plainValue The plain text thought value.
 */
function punctuationSubSentenceDelimiter(plainValue: string): { split: RegExp; leading: RegExp } | null {
  return plainValue.includes(',')
    ? { split: /,/, leading: /^,/ }
    : symbolSplitRegex.test(plainValue)
      ? { split: symbolSplitRegex, leading: symbolLeadingRegex }
      : null
}

/**
 * Returns the delimiter to split a single sentence into sub-sentences, as a regex that matches the delimiter anywhere and a regex that matches it at the beginning of the remaining text.
 * Comma takes priority over the symbols ↑↓←→+, which take priority over "and". Each is only used when the value contains none of the delimiters above it.
 * "and" is matched with word boundaries so that it does not split within a word, e.g. "Standard" (#4810).
 *
 * @param plainValue The plain text thought value.
 */
function subSentenceDelimiter(plainValue: string): { split: RegExp; leading: RegExp } {
  return punctuationSubSentenceDelimiter(plainValue) ?? { split: /\band\b/i, leading: /^and\b/i }
}

/**
 * Inserts separators in place of the punctuation sub-sentence delimiter, unless the delimiter is part of a style within a font tag (#3455).
 * The word "and" is deliberately not a delimiter here: this runs on a value whose periods turned out not to be sentence boundaries, where "and" routinely joins the parts of a single sentence, e.g. "Fruit cost: apple $10.23 and pear $10.70".
 */
function separateBySubSentenceDelimiter(str: string) {
  const delimiter = punctuationSubSentenceDelimiter(str)
  if (!delimiter) return str

  const styleRegex = /style="[^"]+$/
  // Splitting with a capture group keeps the delimiter, so that one embedded in a style can be restored in place. The parts alternate text and delimiter, e.g. "a, b" -> ["a", ",", " b"].
  const parts = str.split(new RegExp(`(${delimiter.split.source})`))

  return parts.reduce(
    (accum, part, i) =>
      // the delimiters sit at odd indices, each emitted by the text part before it
      i % 2 === 1 ? accum : accum + part + (styleRegex.test(accum + part) ? (parts[i + 1] ?? '') : SEPARATOR_TOKEN),
    '',
  )
}

/**
 * Splits formatted HTML by sub-sentence delimiters based on plain text offsets.
 *
 * @param htmlValue The original HTML thought value.
 * @param plainValue The plain text thought value.
 */
function splitFormattedHtmlBySubSentence(htmlValue: string, plainValue: string): string[] {
  const { split, leading: delimiterRegex } = subSentenceDelimiter(plainValue)
  const splitValues = plainValue.split(split)
  let offset = 0

  return splitValues.reduce((accum: string[], splitValue) => {
    const startOffset = offset
    const endOffset = startOffset + splitValue.length
    const htmlSplitValue = sliceHtmlByTextOffsets(htmlValue, startOffset, endOffset)
    const formattedValue = trimHtml(htmlSplitValue)

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
    const [, mainThought] = parentheticalMatch
    const parentheticalIndex = plainValue.indexOf('(', mainThought.length)
    const closingParentheticalIndex = plainValue.lastIndexOf(')')
    const mainHtml = sliceHtmlByTextOffsets(value, 0, mainThought.length)
    const subHtml = sliceHtmlByTextOffsets(value, parentheticalIndex + 1, closingParentheticalIndex)

    return [{ value: trimHtml(mainHtml) }, { value: trimHtml(subHtml), insertNewSubThought: true }].filter(
      s => s.value !== '',
    )
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

  // if we're sub-sentence or in one sentence territory, check for child splitting first
  // e.g. "one - 1" -> "- one   - 1" (as child)
  // e.g. "Start: 1" -> "- Start   - 1" (as child)
  if (!sentenceSplitters || hasOnlyPeriodAtEnd()) {
    // Check for a dash (-, –, or —) or a colon and split into child if found
    // This handles Case 1: Split into child when there's only one sentence
    // Match the first delimiter that has content on both sides. A colon must be followed by whitespace so that it does not split a time, e.g. "10:30".
    // A dash surrounded by whitespace is a delimiter and takes priority over commas, e.g. "Shopping list - apples, bananas".
    // A dash without surrounding whitespace may be part of a hyphenated word, so commas take priority, e.g. "Jeff Koons, Jean-Michel Basquiat" (#3525).
    const isCommaList = plainValue.split(',').filter(s => s.trim()).length > 1
    const childMatch = plainValue.match(
      isCommaList ? /^(.+?)(?:\s+[-–—]\s+|\s*:\s+)(.+)$/ : /^(.+?)\s*(?:[-–—]\s*|:\s+)(.+)$/,
    )
    if (childMatch) {
      const [_, leftPart, rightPart] = childMatch
      const trimmedLeft = leftPart.trim()
      const trimmedRight = rightPart.trim()
      // Only split if both parts have content
      if (trimmedLeft && trimmedRight) {
        const rightPartStart = plainValue.lastIndexOf(rightPart)
        const leftHtml = sliceHtmlByTextOffsets(value, 0, leftPart.length)
        const rightHtml = sliceHtmlByTextOffsets(value, rightPartStart, plainValue.length)
        // the right side of the dash is split by comma so that each item becomes its own child
        // e.g. "Shopping list - apples, bananas" -> "- Shopping list   - apples   - bananas"
        const rightValues = rightPart.includes(',')
          ? splitFormattedHtmlBySubSentence(rightHtml, rightPart)
          : [trimHtml(rightHtml)]
        return [
          { value: trimHtml(leftHtml) },
          // only the first item becomes a child of the left side; the rest are its siblings
          ...rightValues.map((value, i) => ({ value, ...(i === 0 ? { insertNewSubThought: true } : null) })),
        ]
      }
    }

    // Check for slash and split into a chain of descendants, each part a child of the previous
    // e.g. "one/two/three" -> "- one  - two (child)  - three (grandchild)"
    if (plainValue.includes('/')) {
      let offset = 0
      const boundaries = plainValue.split('/').map(part => {
        const start = offset
        offset += part.length + 1
        return { start, end: start + part.length }
      })
      const parts = boundaries.filter(({ start, end }) => plainValue.slice(start, end).trim() !== '')
      // Only split if the slash has content on both sides
      if (parts.length > 1) {
        return parts.map(({ start, end }, i) => ({
          value: trimHtml(sliceHtmlByTextOffsets(value, start, end)),
          ...(i > 0 ? { insertNewSubThought: true } : null),
        }))
      }
    }

    // if we're sub-sentence or in one sentence territory, split by comma, or by the word "and" if there is no comma
    // e.g. "john, johnson, john doe" -> "- john - johnson - john doe"
    // e.g. "Alice and the Lion" -> "- Alice - the Lion"
    const splitValues = plainValue
      .split(subSentenceDelimiter(plainValue).split)
      .map(s => s.trim())
      .filter(s => s !== '')
    const values = plainValue !== value ? splitFormattedHtmlBySubSentence(value, plainValue) : splitValues
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

  // if the return string is one sentence that ends with no other main split characters except one period at the end, split the thought by its sub-sentence delimiter
  const hasOnlyPeriodSplitterAtEnd = !/;!?$/.test(resultSentences)

  const right =
    !resultSentences.match(SEPARATOR_TOKEN) && hasOnlyPeriodSplitterAtEnd
      ? separateBySubSentenceDelimiter(resultSentences)
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
