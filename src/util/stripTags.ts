/** Matches all HTML tags. */
const regexpTags = /(<([^>]+)>)/ig

/** Strips all html tags. */
export const stripTags = (s: string) => s.replace(regexpTags, '')
