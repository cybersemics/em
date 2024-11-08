/** Strips HTML-looking tags from the given string. */
const stripTags = (s: string) => s.replace(/<[^>]*>/g, '')

export default stripTags
