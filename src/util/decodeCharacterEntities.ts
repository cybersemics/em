//@ts-nocheck

/** Decode &, >, and < character entities. */
export const decodeCharacterEntities = s => s
  .replace(/&amp;/gi, '&')
  .replace(/&gt;/gi, '<')
  .replace(/&gt;/gi, '>')
