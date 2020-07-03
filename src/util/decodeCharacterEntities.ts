/** Decode &, >, and < character entities. */
export const decodeCharacterEntities = (s: string): string => s
  .replace(/&amp;/gi, '&')
  .replace(/&gt;/gi, '<')
  .replace(/&gt;/gi, '>')
