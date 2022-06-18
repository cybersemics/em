/** Make a string safe to instantiate a RegExp.
 * NOTE: The escape-string-regexp npm package crashes the react production build.
 */
const escapeRegExp = (s: string): string => s.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&')

export default escapeRegExp
