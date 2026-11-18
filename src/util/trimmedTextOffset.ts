/** Maps a draft text offset to the saved text after trimming its boundaries. */
const trimmedTextOffset = (offset: number, text: string, savedText: string): number => {
  const savedStart = text.indexOf(savedText)
  // The fallback paste path can normalize interior whitespace as well, so keep the plain-text adjustment in that case.
  const removedLeadingLength = savedStart < 0 ? text.length - text.trimStart().length : savedStart
  return Math.min(Math.max(0, offset - removedLeadingLength), savedText.length)
}

export default trimmedTextOffset
