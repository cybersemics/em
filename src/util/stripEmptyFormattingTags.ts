/** Strips all empty formatting tags. */
const stripEmptyFormattingTags = (s: string) => {
  return s.replace(/(((<\w+>)+( |\n|(<br>))*(<\/\w+>)+)+)|<br>/g, '')
}

export default stripEmptyFormattingTags
