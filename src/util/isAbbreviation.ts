/**
 * Function: isAbbrEndSplitter.
 *
 * @param str The sentence just added into the newSentences array, it contains the sentence and the first splitter.
 * @param s The current sentence which is right behind the spliter.
 * @param spliter2 The second spliter.
 * @returns A boolean value that tells whether the dot comes from an Abbrev word, and shouldn't be split
 * Examples: Mr. Dr. Apt. Prof. Ph.D.
 */
export function isAbbrev(prevSentence : string, s: string, spliter2 : string) {
  return isAbbrEndSplitter(prevSentence, s) || isAbbrMidSplitter(prevSentence, s) || isAbbrDoubleSplitter(prevSentence, s, spliter2)
}

/**
 * Function: isAbbrEndSplitter.
 *
 * @param str The sentence just added into the newSentences array, it contains the sentence and the first splitter.
 * @param s The current sentence which is right behind the spliter.
 * @returns A boolean value that tells whether the dot comes from an Abbrev word, and shouldn't be split
 * Examples: Mr. Dr. Apt. Feb. Prof.
 */
function isAbbrEndSplitter (str : string, s : string) {
  const twoLetters = ['Mr.', 'Ms.', 'Dr.', 'Rm.', 'No.', 'no.', 'vs.', 'Rd.', 'St.', 'Co.', 'Jr.', 'pl.', 'Sr.']
  const threeLetters = ['Mrs.', 'Jan.', 'Feb.', 'Jun.', 'Aug.', 'Oct.', 'Nov.', 'Dec.', 'Apt.', 'est.', 'Ave.', 'Tel.', 'alt.', 'Col.', 'inc.', 'Ltd.', 'vol.']
  const fourLetters = ['Sept.', 'addr.', 'Prof.', 'Dept.', 'temp.', 'Blvd.', 'abbr.', 'Assn.', 'Corp.', 'Univ.']
  const fiveLetters = ['et al.']
  const sixLetters = ['Abbrev.', 'approx.']

  const len = str.length
  const isTwoLetters = twoLetters.includes(str.slice(len - 3, len))
  const isThreeLetters = threeLetters.includes(str.slice(len - 4, len))
  const isFourLetters = fourLetters.includes(str.slice(len - 5, len))
  const isFiveLetters = fiveLetters.includes(str.slice(len - 6, len))
  const isSixLetters = sixLetters.includes(str.slice(len - 7, len))

  return !!isTwoLetters || !!isThreeLetters || !!isFourLetters || !!isFiveLetters || !!isSixLetters
}

/**
 * Function: isAbbrMidSplitter.
 *
 * @param str The sentence just added into the newSentences array, it contains the sentence and the first splitter.
 * @param s The current sentence which is right behind the spliter.
 * @returns A boolean value that tells whether the dot comes from an Abbrev word, and shouldn't be split
 * Examples: TL;DR.
 */
function isAbbrMidSplitter (str : string, s : string) {

  const isphD = !!str.match(/[ph.|Ph.]$/) && !!s.match(/^[d|D]/)
  const isTLDR = !!str.match(/TL;$/) && !!s.match(/^DR/)
  return isphD || isTLDR
}

/**
 * Function: isAbbrDoubleSplitter, example: i.e., e.g..
 *
 * @param str1 The charactor before the first spliter and the first spliter.
 * @param str2 The charactor after the first spliter.
 * @param spliter2 The second spliter.
 * @returns A bolean value that says whether it is something inside the pair array, such as M.S.
 */
function isAbbrDoubleSplitter (str1 : string, str2: string, spliter2: string) {
  const pairs1 = [['B.', 'A.'], ['M.', 'S.'], ['B.', 'S.'], ['B.', 'C.'], ['D.', 'C.'], ['R.', 'N.'], ['U.', 'S.'], ['P.', 'S.'], ['e.', 'g.'], ['i.', 'e.'], ['U.', 'N.'], ['P.', 'O.']]
  const pairs2 = [['Ph.', 'D.'], ['Ed.', 'D.']]

  const len = str1.length
  const isHalfPattern = !!pairs1.find(p => str1.slice(len - 2) === p[0] && p[1] === str2 + spliter2) || !!pairs2.find(p => str1.slice(len - 3) === p[0] && p[1] === str2 + spliter2)

  const isFullPattern : boolean = !!pairs1.find(p =>
    str1.slice(len - 4) === p[0] + p[1]) || !!pairs2.find(p => str1.slice(len - 5) === p[0] + p[1])

  return isHalfPattern || isFullPattern
}
