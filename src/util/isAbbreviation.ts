/**
 * Function: isAbbreviation.
 *
 * @param str1 The sentence just added into the result sentence, it contains the sentence and the splitter.
 * @param s The current sentence which is right behind the spliter.
 * @returns A boolean value that tells whether the dot comes from an Abbrev word, and shouldn't be split
 * Examples: Mr. Dr.q Apt. Prof. Ph.D.
 */
export default function isAbbreviation(str1: string, s: string) {
  return isAbbrEndSplitter(str1) || isAbbrMidSplitter(str1, s) || isAbbrDoubleSplitter(str1, s)
}

/**
 * Function: isAbbrEndSplitter.
 *
 * @param str1 The sentence just added into the result sentence, it contains the sentence and the splitter.
 * @param s The current sentence which sits right behind the spliter.
 * @returns A boolean value that tells whether the dot comes from an Abbrev word that has an dot on the word end, and shouldn't be split
 * Examples: Mr. Dr. Apt. Feb. Prof.
 */
function isAbbrEndSplitter(str1: string) {
  if (str1[str1.length - 1] !== '.') return false

  const twoLetters = ['Mr.', 'Ms.', 'Dr.', 'Rm.', 'No.', 'no.', 'vs.', 'Rd.', 'St.', 'Co.', 'Jr.', 'pl.', 'Sr.']
  const threeLetters = [
    'Mrs.',
    'Jan.',
    'Feb.',
    'Jun.',
    'Aug.',
    'Oct.',
    'Nov.',
    'Dec.',
    'Apt.',
    'est.',
    'Ave.',
    'Tel.',
    'alt.',
    'Col.',
    'inc.',
    'Ltd.',
    'vol.',
  ]
  const fourLetters = ['Sept.', 'addr.', 'Prof.', 'Dept.', 'temp.', 'Blvd.', 'abbr.', 'Assn.', 'Corp.', 'Univ.']
  const fiveLetters = ['et al.']
  const sixLetters = ['Abbrev.', 'approx.']

  const len = str1.length
  const isTwoLetters = twoLetters.includes(str1.slice(len - 3, len))
  const isThreeLetters = threeLetters.includes(str1.slice(len - 4, len))
  const isFourLetters = fourLetters.includes(str1.slice(len - 5, len))
  const isFiveLetters = fiveLetters.includes(str1.slice(len - 6, len))
  const isSixLetters = sixLetters.includes(str1.slice(len - 7, len))

  return isTwoLetters || isThreeLetters || isFourLetters || isFiveLetters || isSixLetters
}

/**
 * Function: isAbbrMidSplitter.
 *
 * @param str1 The sentence just added into the result sentences, it contains the sentence and the splitter.
 * @param s The current sentence which is right behind the spliter.
 * @returns A boolean value that tells whether the dot comes from an Abbrev word like TL;DR, and shouldn't be split.
 */
function isAbbrMidSplitter(str1: string, s: string) {
  const isTLDR = !!str1.match(/TL;|tl;$/) && !!s.match(/^DR|dr/)
  return isTLDR
}

/**
 * Function: isAbbrDoubleSplitter, example: i.e., e.g..
 *
 * @param str1 The sentence before the first spliter and the first spliter.
 * @param s The sentence after the first spliter.
 * @returns A bolean value that says whether it is an abbreviation that has double dots, such as "M.S.", "R.N.".
 */
function isAbbrDoubleSplitter(str1: string, s: string) {
  if (str1[str1.length - 1] !== '.') return false

  const pairs = [
    ['B.', 'A.'],
    ['M.', 'S.'],
    ['B.', 'S.'],
    ['B.', 'C.'],
    ['D.', 'C.'],
    ['R.', 'N.'],
    ['U.', 'S.'],
    ['P.', 'S.'],
    ['e.', 'g.'],
    ['i.', 'e.'],
    ['U.', 'N.'],
    ['P.', 'O.'],
    ['Ph.', 'D.'],
    ['Ed.', 'D.'],
  ]

  const len = str1.length

  const isFullPattern = !!pairs.find(p => str1.slice(len - p[0].length - p[1].length) === p[0] + p[1])

  return isFullPattern
}
