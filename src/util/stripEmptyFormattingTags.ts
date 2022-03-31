/** Strips all empty formatting tags. */
export const stripEmptyFormattingTags = (s: string) => {
  return s.replace(/(((<\w+>)+( |\n|(<br>))*(<\w+>)+)+)|<br>/g, '')
}
