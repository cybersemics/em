//@ts-nocheck

/** Convert a single url component to an thought.
 * User entered "~" characters are double encoded.
 */
export const componentToThought = component => window.decodeURIComponent(window.decodeURIComponent(component.replace(/~|%25$/, '')))
