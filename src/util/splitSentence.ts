import getTextContentFromHTML from '../device/getTextContentFromHTML'
import * as selection from '../device/selection'
import isAbbreviation from './isAbbreviation'
import once from './once'
import splitHtmlAtTextOffset from './splitHtmlAtTextOffset'
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

/** Matches a copula, that is a finite form of "to be", surrounded by whitespace. The form "am" is excluded since it is usually a time, e.g. "10 am", and the non-finite forms "be", "been", and "being" do not separate a subject from a predicate, e.g. "It will be a good day". */
const copulaRegex = /\s+(?:is|are|was|were)\s+/i

/** Matches a sentence with a copula, capturing the subject before it and the predicate after it. */
const copulaSplitRegex = new RegExp(`^(.+?)${copulaRegex.source}(.+)$`, 'i')

/** Matches a subject that is a bare pronoun, which would make a meaningless thought on its own, e.g. "This is a single sentence" or "There is a problem". */
const pronounRegex = /^(?:i|you|he|she|it|we|they|this|that|these|those|there|here|who|what|which|where|when|why|how)$/i

/**
 * Formats the predicate of a copula split as a thought of its own: drops a leading article and, when the subject is capitalized, capitalizes the first letter, e.g. "the most valuable resource" -> "Most valuable resource".
 *
 * @param htmlValue The trimmed predicate HTML.
 * @param subject The plain text subject.
 */
function formatPredicate(htmlValue: string, subject: string): string {
  const plainValue = getTextContentFromHTML(htmlValue)
  // an article is only dropped when something follows it
  const article = plainValue.match(/^(?:a|an|the)\s+(?=\S)/i)
  const withoutArticle = article
    ? trimHtml(sliceHtmlByTextOffsets(htmlValue, article[0].length, plainValue.length))
    : htmlValue
  // trimHtml leaves leading tags in place, so the first letter follows them, e.g. "<b>m</b>ost"
  return /^\s*\p{Lu}/u.test(subject)
    ? withoutArticle.replace(/^((?:<[^>]*>)*)(\S)/, (match, tags, char) => tags + char.toUpperCase())
    : withoutArticle
}

/**
 * Splits a value into a main thought and a child at the first delimiter matched by the given regex, e.g. "one - 1" -> "- one   - 1". The right side of the delimiter is split by comma so that each item becomes its own child, e.g. "Shopping list - apples, bananas" -> "- Shopping list   - apples   - bananas". Returns null when the delimiter does not match or either side is empty.
 *
 * @param htmlValue The original HTML thought value.
 * @param plainValue The plain text thought value.
 * @param delimiterRegex Matches the delimiter, capturing the text before it and the text after it.
 */
function splitIntoChild(htmlValue: string, plainValue: string, delimiterRegex: RegExp): SplitResult[] | null {
  const match = plainValue.match(delimiterRegex)
  if (!match) return null

  const [, leftPart, rightPart] = match
  // Only split if both parts have content
  if (!leftPart.trim() || !rightPart.trim()) return null

  const rightPartStart = plainValue.lastIndexOf(rightPart)
  const leftHtml = sliceHtmlByTextOffsets(htmlValue, 0, leftPart.length)
  const rightHtml = sliceHtmlByTextOffsets(htmlValue, rightPartStart, plainValue.length)
  const rightValues = rightPart.includes(',')
    ? splitFormattedHtmlBySubSentence(rightHtml, rightPart)
    : [trimHtml(rightHtml)]

  return [
    { value: trimHtml(leftHtml) },
    // only the first item becomes a child of the left side; the rest are its siblings
    ...rightValues.map((value, i) => ({ value, ...(i === 0 ? { insertNewSubThought: true } : null) })),
  ]
}

/**
 * Splits a value that ends with a hyphenated "and" compound into the words before the compound as the main thought and the compound's words as its children, e.g. "Implies set-and-forget" -> "- Implies   - set   - forget". A compound with no words before it splits into siblings, e.g. "set-and-forget" -> "- set   - forget". Returns null when the value does not end with such a compound.
 *
 * @param htmlValue The original HTML thought value.
 * @param plainValue The plain text thought value.
 */
function splitHyphenatedAndCompound(htmlValue: string, plainValue: string): SplitResult[] | null {
  const match = plainValue.match(/^(.*?)\s*(\S+(?:-and-\S+)+)\s*$/i)
  if (!match) return null

  const [, leadIn, compound] = match
  // the compound is the last word of the value, so it starts where it last occurs
  const compoundStart = plainValue.lastIndexOf(compound)
  const words = compound.split(/-and-/i)
  const wordValues = words.map((word, i) => {
    // each word starts after the words before it and the "-and-" that joins each of them to the next
    const start =
      compoundStart +
      words.slice(0, i).reduce((length, previousWord) => length + previousWord.length + '-and-'.length, 0)
    return trimHtml(sliceHtmlByTextOffsets(htmlValue, start, start + word.length))
  })

  return leadIn.trim()
    ? [
        { value: trimHtml(sliceHtmlByTextOffsets(htmlValue, 0, leadIn.length)) },
        // only the first word becomes a child of the main thought; the rest are its siblings
        ...wordValues.map((value, i) => ({ value, ...(i === 0 ? { insertNewSubThought: true } : null) })),
      ]
    : wordValues.map(value => ({ value }))
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

  // if we're sub-sentence or in one sentence territory, try the delimiters in order of precedence:
  // 1. a dash surrounded by whitespace or a colon splits into a child, e.g. "one - 1" -> "- one   - 1", "Start: 1" -> "- Start   - 1"
  // 2. a copula splits into a subject and its predicate as a child, e.g. "Attention is the most valuable resource" -> "- Attention   - Most valuable resource"
  // 3. a slash splits into a chain of descendants, e.g. "one/two/three" -> "- one   - two   - three"
  // 4. a comma or one of the symbols ↑↓←→+ splits into siblings, e.g. "john, johnson, john doe" -> "- john - johnson - john doe"
  // 5. a hyphenated "and" compound at the end of the value splits into a child per word, e.g. "Implies set-and-forget" -> "- Implies   - set   - forget"
  // 6. the word "and" splits into siblings, e.g. "Alice and the Lion" -> "- Alice - the Lion"
  // 7. a dash without surrounding whitespace splits into a child, e.g. "one-1" -> "- one   - 1"
  // A dash without surrounding whitespace is usually part of a compound word, e.g. "Jean-Michel", so it has the lowest precedence of all: it only splits when the value contains no other delimiter (#3525).
  // e.g. "Jeff Koons, Jean-Michel Basquiat" splits at the comma and "a → b-c" splits at the arrow.
  if (!sentenceSplitters || hasOnlyPeriodAtEnd()) {
    // A colon must be followed by whitespace so that it does not split a time, e.g. "10:30".
    const childValues = splitIntoChild(value, plainValue, /^(.+?)(?:\s+[-–—]\s+|\s*:\s+)(.+)$/)
    if (childValues) return childValues

    // Only a sentence with exactly one copula is split: "The sky is blue and the grass is green" is two clauses rather than a subject and a predicate, so it is left to the sibling delimiters below.
    // A subject that is a bare pronoun is not split off either, e.g. "There is a problem".
    const clauses = plainValue.split(copulaRegex)
    const copulaValues =
      clauses.length === 2 && !pronounRegex.test(clauses[0].trim())
        ? splitIntoChild(value, plainValue, copulaSplitRegex)
        : null
    if (copulaValues) {
      // the predicate of a copula becomes a thought of its own, so it is formatted as one
      return copulaValues.map((result, i) =>
        i === 0 ? result : { ...result, value: formatPredicate(result.value, clauses[0]) },
      )
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

    // A hyphenated "and" compound at the end of the value, e.g. "set-and-forget", is a list of single words rather than a sentence joined by "and", so it is split before the word "and" is. A comma or a symbol still takes priority, e.g. "set-and-forget, fire-and-forget" splits at the comma (#5215).
    const compoundValues = punctuationSubSentenceDelimiter(plainValue)
      ? null
      : splitHyphenatedAndCompound(value, plainValue)
    if (compoundValues) return compoundValues

    // split by comma, or by the symbols ↑↓←→+ if there is no comma, or by the word "and" if there is neither
    // e.g. "john, johnson, john doe" -> "- john - johnson - john doe"
    // e.g. "Alice and the Lion" -> "- Alice - the Lion"
    const splitValues = plainValue
      .split(subSentenceDelimiter(plainValue).split)
      .map(s => s.trim())
      .filter(s => s !== '')
    const values = plainValue !== value ? splitFormattedHtmlBySubSentence(value, plainValue) : splitValues
    if (values.length > 1) return values.map(value => ({ value }))

    // nothing else splits the value, so a dash without surrounding whitespace is the delimiter of last resort
    // e.g. "one-1" -> "- one   - 1"
    return splitIntoChild(value, plainValue, /^(.+?)[-–—](.+)$/) ?? values.map(value => ({ value }))
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
