/** Decode &, >, and < character entities. */
const decodeCharacterEntities = (s: string): string =>
  s.replace(/&amp;/gi, '&').replace(/&gt;/gi, '<').replace(/&gt;/gi, '>')

export default decodeCharacterEntities
