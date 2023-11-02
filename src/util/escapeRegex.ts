/** Make a string safe to instantiate a RegExp.
 * NOTE: The escape-string-regexp npm package crashes the react production build.
 */
const escapeRegex = (s: string): string => s.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&')

export default escapeRegex
