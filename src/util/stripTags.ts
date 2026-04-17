/** Matches text that looks like a single html tag with attribute-like words, e.g. "<hello world of people>" or "<hello world=\"\"></hello>". */
const REGEX_LITERAL_ANGLE_BRACKET_TEXT =
  /^<([^\s/>]+)((?:\s+[^\s=/>]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]*))?)*)\s*>(?:<\/\1>\s*)?$/

/** Matches attribute-like words in a single opening tag. */
const REGEX_LITERAL_ANGLE_BRACKET_ATTRIBUTES = /\s+([^\s=/>]+)/g

/** Strips HTML-looking tags from the given string. */
const stripTags = (s: string) => {
  const literalAngleBracketText = s.trim().match(REGEX_LITERAL_ANGLE_BRACKET_TEXT)

  return literalAngleBracketText
    ? [
        literalAngleBracketText[1],
        ...Array.from(literalAngleBracketText[2].matchAll(REGEX_LITERAL_ANGLE_BRACKET_ATTRIBUTES)).map(
          ([, word]) => word,
        ),
      ].join(' ')
    : s.replace(/<[^>]*>/g, '')
}

export default stripTags
