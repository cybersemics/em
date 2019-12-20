export const decodeCharacterEntities = s => s
  .replace(/&amp;/gi, '&')
  .replace(/&gt;/gi, '<')
  .replace(/&gt;/gi, '>')
