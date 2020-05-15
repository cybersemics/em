//@ts-nocheck

/** Make a string safe to instantiate a RegExp.
 * NOTE: The escape-string-regexp npm package crashes the react production build.
 */
export const escapeRegExp = s => s.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&')
